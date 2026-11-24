# B1 visitor check and rollback baseline

This record supports [ticket #27](https://github.com/Votok/pokuk-next/issues/27).
The baseline is incomplete. The public HTTP checks passed, the full browser
journey is unverified, and the deployed build and matching configuration
still need to be captured from the personal Azure subscription.

## Public check on November 24, 2026

| Item | Evidence |
| --- | --- |
| Endpoint | [Public gallery](https://pokuk.azurewebsites.net/) returned HTTP 200 over HTTPS |
| Event | The index linked to [Guatemala (2025)](https://pokuk.azurewebsites.net/Home/Detail/2025Guatemala). The event response had the heading **Guatemala** and 50 tiles |
| Selected photo | `2025_Guatemala_0Z3A1428.jpg`, first tile at verification. Its direct link returned HTTP 200 and a 1400 × 933 JPEG. SHA-256 `388bfa21aa44822efd6653ba98057399ca95a86aa9842cb6a011e3f841481ae0` |
| Build | Legacy ASP.NET gallery. The active Kudu deployment ID and source commit are unverified |
| Result | Partial. PhotoSwipe initialization and the direct photo link were present in the delivered HTML. Browser rendering, the open lightbox, and independent comparison with the catalog's exact URL remain unverified |

The legacy page links each tile directly to its original and uses the same
image in PhotoSwipe. The delivered markup and legacy view contain no
**Originál** action. To exercise an equivalent legacy path, open the image
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

## Capture the B1 recovery baseline before handoff

- In the personal subscription, use App Service Deployment Center and
  [Kudu deployment history](https://learn.microsoft.com/en-us/azure/app-service-web/web-sites-nodejs-debug#inspect-deployed-files-using-kudu)
  to identify the active deployment. Record its ID and source commit.
  Retain a restorable copy of the matching deployed build in restricted
  storage, record its checksum and location, and verify it is retrievable.
- Record the app's runtime stack, startup configuration, app setting and
  connection string names, catalog and storage configuration references,
  identity and its relevant grants, and deployment source. Record where to
  retrieve the matching configuration. Keep secret values in their secret
  store. If the deployed files include configuration containing secrets,
  retain that configuration separately in the secret store.
- Record the public hostname, DNS record and TTL where the maintainer
  controls them, and any proxy origin, App Service hostname binding and TLS
  binding. The tested endpoint is an Azure-managed App Service hostname.
  Confirm the actual visitor URL and routing controls in Azure before
  planning a switch.
- Store the recovery record alongside the dated visitor result. The current
  CLI session exposed an enterprise subscription only, so the active B1
  deployment, configuration and routing controls could not be captured.

## Restore and verify

1. Suspend promotion. If B1 needs repair, restore its saved runtime and
   configuration references and deploy the saved build using the App
   Service deployment method for that artifact. For a prepared ZIP, use
   [App Service ZIP deployment](https://learn.microsoft.com/en-us/azure/app-service/deploy-zip).
   Verify that B1 serves the recorded build.
2. Restore the recorded traffic routing to B1, including the prior proxy
   origin or DNS target and hostname/TLS bindings where applicable.
3. Repeat the visitor check at the public URL. Record the endpoint, restored
   build and result before resuming deployments.
