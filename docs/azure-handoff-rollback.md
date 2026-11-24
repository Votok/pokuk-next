# B1 visitor check and rollback baseline

This record supports [ticket #27](https://github.com/Votok/pokuk-next/issues/27).
The public browser check passed. The B1 build and matching configuration
were verified by reconstructing the deployment package offline.

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
reports Local Git as the deployment source. The maintainer confirmed the
legacy checkout's `azure` remote is the deployment path. The app runs
.NET 8 on a 64-bit worker with Always On disabled and no startup command
override. App Service lists `WEBSITE_NODE_DEFAULT_VERSION` as the only app
setting, no connection strings, and no managed identity. The legacy app
reads its catalog and storage connection from `appsettings.json`.

The app requires HTTPS and lists `pokuk.azurewebsites.net`, `pokuk.eu`,
and `www.pokuk.eu` as visitor hostnames. The two custom names did not
resolve during verification and have no enabled App Service TLS binding.
The verified visitor endpoint is `https://pokuk.azurewebsites.net/`, an
Azure-managed hostname bound to B1. Any later public cutover needs a routing
plan that accounts for this binding.

## Recovery files

The maintainer's Mac holds `build.zip` and `restore.json` in
`~/Library/Application Support/Pokuk/b1-724206121acd2863c25a49337537b09de6494954/`.
The folder and files are owner-only. `build.zip` was taken from the active
[Kudu site files](https://github.com/projectkudu/kudu/wiki/rest-api#zip) and
read back with SHA-256
`407d140aef2689426e770dbf609c9c4c47aab3767631570c95661dbfaff0bb8e`.

`restore.json` records the existing private settings file and the deployed
`LocalGalleryDirectory` override. The credentials remain in the legacy
checkout's ignored `appsettings.json`. During capture, the private file
with the override matched the complete deployed production JSON in memory.
The development settings matched the pinned source byte for byte. The
reconstructed package accounted for all 77 Kudu ZIP entries, and each
retained archive entry matched its deployed bytes. The live app was used
for the visitor check. Recovery was verified offline.

## Restore and verify

1. Suspend promotion. If B1 needs repair, verify the `build.zip` checksum,
   then unpack it in a private temporary directory. Copy in the private
   `appsettings.json` referenced by `restore.json` and apply its recorded
   `LocalGalleryDirectory` override. Add `appsettings.Development.json`
   from the pinned legacy commit. Keep these files private throughout.
2. Restore the recorded App Service runtime settings. Zip the contents of
   the temporary directory with `web.config` and `web.dll` at the archive
   root. Deploy the prebuilt package with
   [App Service ZIP deployment](https://learn.microsoft.com/en-us/azure/app-service/deploy-zip),
   with build automation disabled. Remove the temporary directory and
   assembled ZIP after use. Verify that B1 serves the recorded build.
3. Restore any public routing changed during handoff to the recorded B1
   endpoint and verify its HTTPS binding.
4. Repeat the visitor check at the public URL. Record the endpoint, restored
   build and result before resuming deployments.
