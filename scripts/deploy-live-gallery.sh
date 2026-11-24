#!/usr/bin/env bash
set -euo pipefail

app_state() {
  az containerapp show --name "$APP" --resource-group "$RESOURCE_GROUP" --only-show-errors -o json
}

check_gallery() {
  node scripts/check-live-gallery.mjs "$@" 2>&1 | tee -a "$GITHUB_STEP_SUMMARY"
}

routed_revision() {
  jq -er '
    select(.properties.configuration.activeRevisionsMode == "Multiple")
    | .properties.configuration.ingress.traffic
    | map(select(.weight > 0))
    | select(length == 1)
    | .[0]
    | select(.weight == 100 and .latestRevision != true)
    | .revisionName
  '
}

check_stable() {
  local expected=$1
  [[ "$(app_state | routed_revision)" == "$expected" ]] || return 1
  # The manually deployed first candidate predates the response marker.
  if [[ "$expected" == "$APP--live-929142d" ]]; then
    check_gallery "$stable"
  else
    check_gallery "$stable" "$expected"
  fi
}

set_traffic() {
  az containerapp ingress traffic set --name "$APP" --resource-group "$RESOURCE_GROUP" \
    --revision-weight "$1=100" --only-show-errors -o none
}

app=$(app_state)
stable="https://$(jq -er '.properties.configuration.ingress.fqdn' <<< "$app")"
previous=$(routed_revision <<< "$app")

printf 'Current revision `%s` at %s\n\n' "$previous" "$stable" >> "$GITHUB_STEP_SUMMARY"
check_stable "$previous"

if [[ "$previous" =~ --g([0-9]+)-[0-9]+$ ]] && (( BASH_REMATCH[1] >= GITHUB_RUN_NUMBER )); then
  printf '\nA deployment from this run or a newer run is already serving visitors.\n' >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi

tag="$IMAGE:$GITHUB_SHA"
az acr login --name "$REGISTRY" --resource-group "$RESOURCE_GROUP" --only-show-errors
docker push "$tag"
image_ref=$(docker image inspect "$tag" --format '{{index .RepoDigests 0}}')
[[ "$image_ref" == "$IMAGE@sha256:"* ]]
revision=$(az containerapp revision copy --name "$APP" --resource-group "$RESOURCE_GROUP" \
  --from-revision "$previous" --image "$image_ref" --min-replicas 0 --only-show-errors \
  --revision-suffix "g${GITHUB_RUN_NUMBER}-${GITHUB_RUN_ATTEMPT}" \
  --query properties.latestRevisionName -o tsv)
candidate=$(az containerapp revision show --name "$APP" --resource-group "$RESOURCE_GROUP" \
  --revision "$revision" --query properties.fqdn -o tsv --only-show-errors)
{
  printf '\nCommit `%s`\n\n' "$GITHUB_SHA"
  printf 'Image `%s`\n\n' "$image_ref"
  printf 'Candidate `%s` at https://%s\n\n' "$revision" "$candidate"
} >> "$GITHUB_STEP_SUMMARY"
check_gallery "https://$candidate" "$revision"

recover() {
  printf '\nPromotion did not complete. Restoring `%s`.\n\n' "$previous" >> "$GITHUB_STEP_SUMMARY"
  if set_traffic "$previous" && check_stable "$previous"; then
    printf '\nRecovery verified for `%s`.\n' "$previous" >> "$GITHUB_STEP_SUMMARY"
  else
    printf '\nRecovery needs intervention. See the gallery rollback runbook.\n' >> "$GITHUB_STEP_SUMMARY"
  fi
  exit 1
}

trap recover EXIT
trap 'exit 130' INT TERM
set_traffic "$revision"
check_stable "$revision"
trap - EXIT INT TERM
printf '\nVerified `%s` at %s.\n' "$revision" "$stable" >> "$GITHUB_STEP_SUMMARY"
