#!/usr/bin/env bash
set -euo pipefail

azure_app() {
  local command
  command=$1
  shift
  az containerapp "$command" --name "$APP" --resource-group "$RESOURCE_GROUP" --only-show-errors "$@"
}

check_gallery() {
  node scripts/check-live-gallery.mjs "$1" 2>&1 | tee -a "$GITHUB_STEP_SUMMARY"
}

set_traffic() {
  az containerapp ingress traffic set --name "$APP" --resource-group "$RESOURCE_GROUP" \
    --revision-weight "$1=100" --only-show-errors -o none
}

app=$(azure_app show -o json)
stable="https://$(jq -er '.properties.configuration.ingress.fqdn' <<< "$app")"
previous=$(jq -er '
  select(.properties.configuration.activeRevisionsMode == "Multiple")
  | .properties.configuration.ingress.traffic
  | map(select(.weight > 0))
  | select(length == 1)
  | .[0]
  | select(.weight == 100 and .latestRevision != true)
  | .revisionName
' <<< "$app")

printf 'Current revision `%s` at %s\n\n' "$previous" "$stable" >> "$GITHUB_STEP_SUMMARY"
check_gallery "$stable"

tag="$IMAGE:$GITHUB_SHA"
az acr login --name "$REGISTRY" --resource-group "$RESOURCE_GROUP" --only-show-errors
docker push "$tag"
image_ref=$(docker image inspect "$tag" --format '{{index .RepoDigests 0}}')
[[ "$image_ref" == "$IMAGE@sha256:"* ]]
revision=$(az containerapp revision copy --name "$APP" --resource-group "$RESOURCE_GROUP" \
  --from-revision "$previous" --image "$image_ref" --min-replicas 0 --only-show-errors \
  --revision-suffix "g${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}" \
  --query properties.latestRevisionName -o tsv)
candidate=$(az containerapp revision show --name "$APP" --resource-group "$RESOURCE_GROUP" \
  --revision "$revision" --query properties.fqdn -o tsv --only-show-errors)
{
  printf '\nCommit `%s`\n\n' "$GITHUB_SHA"
  printf 'Image `%s`\n\n' "$image_ref"
  printf 'Candidate `%s` at https://%s\n\n' "$revision" "$candidate"
} >> "$GITHUB_STEP_SUMMARY"
check_gallery "https://$candidate"

head_sha=$(gh api repos/Votok/pokuk-next/git/ref/heads/main --jq .object.sha)
if [[ "$GITHUB_SHA" != "$head_sha" ]]; then
  printf '\nPromotion skipped because `%s` is no longer the tip of `main`.\n' "$GITHUB_SHA" >> "$GITHUB_STEP_SUMMARY"
  exit 0
fi

if ! set_traffic "$revision" || ! check_gallery "$stable"; then
  printf '\nStable check failed. Restoring `%s`.\n\n' "$previous" >> "$GITHUB_STEP_SUMMARY"
  set_traffic "$previous"
  check_gallery "$stable"
  printf '\nRecovery verified for `%s`.\n' "$previous" >> "$GITHUB_STEP_SUMMARY"
  exit 1
fi
printf '\nVerified `%s` at %s.\n' "$revision" "$stable" >> "$GITHUB_STEP_SUMMARY"
