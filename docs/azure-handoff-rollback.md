# B1 visitor check and rollback baseline

This record supports [ticket #27](https://github.com/Votok/pokuk-next/issues/27).
The public browser check passed. The B1 build and matching configuration
were verified by reconstructing the deployment package offline.

## Live gallery status

On November 24, 2026, the first automatic live deployment from `main`
passed the candidate and stable visitor checks. Azure confirmed 100% of
traffic at the [stable Azure-generated URL](https://pokuk-gallery.agreeablebush-fe2aa1f3.westeurope.azurecontainerapps.io/)
was pinned to `pokuk-gallery--g11-1`. An independent browser check
confirmed the serving revision and the Guatemala photo journey.

| Item | Evidence |
| --- | --- |
| Workflow | [Gallery run 45428398457](https://github.com/Votok/pokuk-next/actions/runs/45428398457), commit `99303eb` |
| Deployed image | `pokuktrial8daf1d89.azurecr.io/gallery-live@sha256:605abbdf91fb9a26892c30e8481c63cee846b11e88de3bc831e3ca005a19053b` |
| Automatic deployment | `azure-live` allows `main` only and `AZURE_LIVE_DEPLOY_ENABLED` is `true` |
| Recovery | `pokuk-gallery--live-929142d` is available for revision rollback. The [legacy B1 URL](https://pokuk.azurewebsites.net/) remains the initial fallback. |
| Handoff tickets | [#25](https://github.com/Votok/pokuk-next/issues/25) and [#29](https://github.com/Votok/pokuk-next/issues/29) are closed |

Azure lists no custom hostname on the live app. Public DNS returned
`NXDOMAIN` for `pokuk.eu` and `www.pokuk.eu` during this check. A shorter
HTTPS bookmark requires control of the chosen domain's DNS and a
[custom domain binding on Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/custom-domains-managed-certificates).

## Public check on November 24, 2026

| Item | Evidence |
| --- | --- |
| Endpoint | [Public gallery](https://pokuk.azurewebsites.net/) returned HTTP 200 over HTTPS |
| Event | The index linked to [Guatemala (2025)](https://pokuk.azurewebsites.net/Home/Detail/2025Guatemala). The event response had the heading **Guatemala** and 50 tiles |
| Selected photo | `2025_Guatemala_0Z3A1428.jpg`, first tile at verification. Its direct link returned HTTP 200 and a 1400 × 933 JPEG. SHA-256 `388bfa21aa44822efd6653ba98057399ca95a86aa9842cb6a011e3f841481ae0` |
| Build | Legacy ASP.NET gallery at commit `724206121acd2863c25a49337537b09de6494954` |
| Result | Pass. Chromium opened the event from the index, loaded the selected tile, and displayed the same photo in PhotoSwipe. The tile's direct link matched the published catalog URL exactly. Opening it in a second tab returned the expected JPEG and checksum |

The legacy page links each tile directly to its original and uses the same
image in PhotoSwipe. The delivered markup and legacy view contain no
**Originál** action. For the maintainer-approved legacy check, open the image
in PhotoSwipe, then open the same tile's direct link in a new tab using
the browser context menu. Record this as a direct-link check. The
**Originál** action in the Next.js gallery can be checked as written in
the spec.

## Repeat the visitor check

1. From the endpoint's index, open **Guatemala** for 2025 and verify the
   heading. Find the recorded photo by its original filename. If the tile
   order has changed, use that filename to locate the photo in the catalog
   and compare the returned bytes against the recorded hash.
2. Verify the tile is visible, open it, and confirm the lightbox shows the
   same photo.
3. On Next.js, follow **Originál**. On B1, exercise the direct-link path
   described above. Compare the actual link with the exact original URL in
   the published catalog, including path encoding and any query string.
   Confirm the URL serves the expected image.
4. Record the endpoint, deployed build or revision, date, and outcome.
   For a partial check, record the first step that failed or could not be
   verified. Keep the catalog URL and any credentials in their authorized
   stores when they contain secrets.

## B1 recovery baseline

The Windows App Service `pokuk` is in resource group `RgWestEuropePokuk2`
in the personal subscription. Kudu reports active deployment
`724206121acd2863c25a49337537b09de6494954`, completed June 15, 2026 at
12:17 UTC. It matches the legacy repository's `master` commit. App Service
reported Local Git as the deployment source before handoff. The maintainer
confirmed the legacy checkout's `azure` remote was the deployment path.
The app runs .NET 8 on a 64-bit worker with Always On disabled and no startup command
override. App Service lists `WEBSITE_NODE_DEFAULT_VERSION` as the only app
setting, no connection strings, and no managed identity. The legacy app
reads its catalog and storage connection from `appsettings.json`.

The app requires HTTPS and lists `pokuk.azurewebsites.net`, `pokuk.eu`,
and `www.pokuk.eu` as visitor hostnames. The two custom names did not
resolve during verification and have no enabled App Service TLS binding.
The verified visitor endpoint is `https://pokuk.azurewebsites.net/`, an
Azure-managed hostname bound to B1. It remains the initial fallback when
the Container Apps hostname becomes the new bookmark.

## Recovery files

The maintainer's Mac holds `build.zip` and `restore.json` in
`~/Library/Application Support/Pokuk/b1-724206121acd2863c25a49337537b09de6494954/`.
The folder and files are owner-only. `build.zip` was taken from the active
[Kudu site files](https://github.com/projectkudu/kudu/wiki/rest-api#zip) and
read back with SHA-256
`407d140aef2689426e770dbf609c9c4c47aab3767631570c95661dbfaff0bb8e`.

`restore.json` records the macOS Keychain item for the exact deployed
`appsettings.json`, named `Pokuk B1 rollback` followed by the deployment
ID, with account `appsettings.json`. The item was read back and verified
byte for byte against the deployed file. The development settings match
the pinned source byte for byte. The build ZIP and the two settings files
account for all 77 Kudu ZIP entries, and each retained archive entry
matches its deployed bytes. The live app was used for the visitor check.
Recovery was verified offline.

## Restore and verify

1. Suspend promotion. If B1 needs repair, verify the `build.zip` checksum,
   then unpack it in a private temporary directory. Retrieve the Keychain
   item referenced by `restore.json` into `appsettings.json` in that
   directory. Add `appsettings.Development.json` from the pinned legacy
   commit. Keep these files private throughout.
2. Restore the recorded App Service runtime settings. Zip the contents of
   the temporary directory with `web.config` and `web.dll` at the archive
   root. Deploy the prebuilt package with
   [App Service ZIP deployment](https://learn.microsoft.com/en-us/azure/app-service/deploy-zip),
   with build automation disabled. Remove the temporary directory and
   assembled ZIP after use. Verify that B1 serves the recorded build.
3. Verify the HTTPS binding on `https://pokuk.azurewebsites.net/` and
   repeat the visitor check there. Record the endpoint, build and result
   before resuming deployments.

## First live Container Apps candidate

The live candidate passed the visitor check on November 24, 2026 while
B1 served `https://pokuk.azurewebsites.net/`.

| Item | Evidence |
| --- | --- |
| Commit | `929142d3c9657c4c5ff8a10c409282e13bf31191` from [passing Gallery CI](https://github.com/Votok/pokuk-next/actions/runs/45393583710) |
| Tested image | `pokuktrial8daf1d89.azurecr.io/gallery@sha256:89e1a5c1885af3091bc02d6ed6a71e4989c3eb10f56ba7102a55d27cff31b8a8` |
| Revision | [`pokuk-gallery--live-929142d`](https://pokuk-gallery--live-929142d.agreeablebush-fe2aa1f3.westeurope.azurecontainerapps.io/) |
| Journey | Chromium opened **Guatemala** for 2025 from the index. The matching tile measured 640 × 427 and the screen preview measured 1400 × 933. **Originál** opened the exact catalog URL and the JPEG matched the recorded SHA-256. |
| Routing before promotion | The stable Container Apps hostname routed 100% to `pokuk-gallery--pending`, which has no live catalog configuration. |

The app is `pokuk-gallery` in `pokuk-smoke-8daf1d89`. It reuses the
Consumption environment and image registry from the fixture exercise,
with zero minimum replicas. Its system identity reads the catalog and
originals in `pokukcontainer` and can write only to the private
`pokuk-previews` container. The revision references the app secret
`preview-signing-v1`. Keep its value in Azure.

## First promotion

1. Confirm the handoff window with the maintainer. Verify that the B1
   fallback still serves the recorded gallery. In App Service Deployment
   Center, disconnect Local Git before enabling automatic live deployment.
2. In the live app's Revision management page, direct 100% of traffic
   to the verified candidate by revision name. Confirm the assigned
   traffic in Azure, run the browser check against the stable endpoint,
   and record the revision and result in this runbook.

   ```sh
   node scripts/check-live-gallery.mjs https://pokuk-gallery.agreeablebush-fe2aa1f3.westeurope.azurecontainerapps.io/
   ```

3. On success, adopt that stable URL as the new bookmark and enable the
   live deployment job. If the check fails, keep the live job disabled,
   route the stable endpoint back to `pokuk-gallery--pending`, and use the
   legacy B1 bookmark. Repair B1 from the saved baseline if needed and
   record the visitor check at the B1 URL before resuming deployment.

### First promotion record

On November 24, 2026 at 16:31 CET, Azure confirmed that the
[stable gallery URL](https://pokuk-gallery.agreeablebush-fe2aa1f3.westeurope.azurecontainerapps.io/)
routed 100% of traffic to `pokuk-gallery--live-929142d`. The stable URL
passed the browser check and became the new bookmark. Chromium opened
**Guatemala** for 2025, verified the 640 × 427 tile and 1400 × 933 screen
preview, and followed **Originál** to the exact catalog URL. The JPEG
matched the recorded SHA-256.

Before changing traffic, the B1 fallback passed the browser check and the
saved build ZIP matched the recorded checksum. App Service then reported
SCM type `None`, and the B1 index returned HTTP 200 after the Local Git
disconnect. The [B1 URL](https://pokuk.azurewebsites.net/) remains the
initial fallback.

## Automatic live deployment

Configure the GitHub environment `azure-live` to allow deployments only
from `main`. The Azure identity `gallery-github-live` federates with
`repo:Votok@29477848/pokuk-next@1467642720:environment:azure-live`.
It needs Container Apps Contributor on the live app and AcrPush plus
Reader on the registry.

| GitHub environment setting | Value |
| --- | --- |
| Secret `AZURE_LIVE_CLIENT_ID` | Client ID of `gallery-github-live` |
| Secret `AZURE_LIVE_TENANT_ID` | Personal Azure tenant ID |
| Secret `AZURE_LIVE_SUBSCRIPTION_ID` | Personal Azure subscription ID |
| Variable `AZURE_LIVE_APP` | `pokuk-gallery` |
| Variable `AZURE_LIVE_RESOURCE_GROUP` | `pokuk-smoke-8daf1d89` |
| Variable `AZURE_LIVE_REGISTRY` | `pokuktrial8daf1d89` |
| Variable `AZURE_LIVE_REGISTRY_SERVER` | `pokuktrial8daf1d89.azurecr.io` |

After the first stable check passes, set the repository Actions variable
`AZURE_LIVE_DEPLOY_ENABLED` to `true`. Passing builds on `main` deploy
an image checked with invented data and pinned by digest. The job copies
the working revision's configuration, verifies the new revision directly,
then pins stable traffic to it and repeats the check. Each new build
identifies its serving revision in the gallery's index markup. If
promotion fails, the job attempts to restore and verify the previous
revision. Inspect the GitHub Actions run summary for the commit, digest,
revision and results. Follow the manual recovery steps if the runner
stops before it can verify recovery.

## Recover a subsequent release

1. Set `AZURE_LIVE_DEPLOY_ENABLED` to `false`, cancel queued live
   deployments, and let any running live deployment finish before
   changing traffic. Find the last verified
   revision in the Gallery workflow summary or in the first promotion
   record above. Keep that revision and its image available.
   Keep the matching app-level secret references and
   values available as well. Use a new secret name for future rotations
   so the older revision can still use its original value.
2. Activate the verified revision if necessary and route traffic to it.
   Use its exact revision name to pin routing across further deployments.

   ```sh
   az containerapp revision activate --resource-group pokuk-smoke-8daf1d89 \
     --name pokuk-gallery --revision "$verified_revision"
   az containerapp ingress traffic set --resource-group pokuk-smoke-8daf1d89 \
     --name pokuk-gallery --revision-weight "$verified_revision=100"
   ```

3. Confirm Azure shows 100% of traffic pinned to the recovered revision.
   Run the browser check on the stable URL with the expected serving
   revision, then record the revision, endpoint and result.

   ```sh
   node scripts/check-live-gallery.mjs https://pokuk-gallery.agreeablebush-fe2aa1f3.westeurope.azurecontainerapps.io/ "$verified_revision"
   ```

   If recovering to `pokuk-gallery--live-929142d`, run the command without
   the revision argument. That build predates the response marker, so use
   Azure's traffic assignment to verify the route. Set
   `AZURE_LIVE_DEPLOY_ENABLED` to `true` after recovery is verified. Keep at
   least the current and previous verified revisions when deactivating
   superseded revisions.

Azure stores the container image, environment variables and scaling
settings per revision. Ingress routing and secret values belong to the
app. This lets a rollback restore the previous container configuration
and route traffic back to it using the same bookmark.
[Microsoft's revision documentation](https://learn.microsoft.com/en-us/azure/container-apps/revisions)
