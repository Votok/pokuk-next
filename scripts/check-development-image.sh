#!/usr/bin/env bash
set -euo pipefail

image=$1
fixture=$(mktemp -d)
container=
cleanup() {
  if [[ -n "$container" ]]; then
    docker rm --force "$container" >/dev/null
  fi
  rm -rf "$fixture"
}
trap cleanup EXIT

chmod 755 "$fixture"
printf '%s\n' '{"Years":[{"Year":2026,"GalleryEvents":[{"Name":"deployment","FriendlyName":"Deployment fixture","Files":[]}]}]}' > "$fixture/catalog.json"
container=$(docker run --detach --platform linux/amd64 --publish 127.0.0.1::3000 \
  --mount "type=bind,source=$fixture,target=/fixture,readonly" \
  --env GALLERY_FIXTURE_DIR=/fixture "$image")
endpoint="http://$(docker port "$container" 3000/tcp)"

for attempt in {1..30}; do
  if page=$(curl --fail --silent --max-time 2 "$endpoint") && [[ "$page" == *'Deployment fixture'* ]]; then
    printf 'The packaged gallery rendered the deployment fixture.\n'
    exit 0
  fi
  sleep 1
done

docker logs "$container" >&2
exit 1
