# Azure gallery smoke test

## Open the invented event

The visitor check in [ticket #23](https://github.com/Votok/pokuk-next/issues/23)
passed on November 24, 2026.

- Main commit: `bba6beb78f38656ddc6eb8f7a7f974b490097bf8`.
  [Passing Gallery CI](https://github.com/Votok/pokuk-next/actions/runs/45263984280)
- Linux amd64 image digest:
  `sha256:6057071bdea1e8a2c43280b13e8cbfd5fc7a8b23dcfc676d8f42749a557af98d`.
- Azure Container Apps Consumption revision: `pokuk-smoke--bba6beb-v2`,
  with zero minimum replicas, one maximum replica, and no log storage destination.
- Chromium opened **Tři barvy** from the deployed index, verified its
  heading, and loaded one 411 × 640 tile that matched the invented original.
  The isolated preview container started empty and held one generated
  JPEG after the check.

The first revision could read the catalog but could not render it because
`GALLERY_PREVIEW_SIGNING_KEY` was missing. The corrected revision added
the server-side secret and used the same image digest. The deployed
gallery reads the published catalog and preview source from a private
container and writes to a separate private preview container. Only the
visitor-facing copy of the invented original is available anonymously.

The maintainer approved proceeding with unverified remaining credit for
this 48-hour trial as an exception to the
[hosting decision](adr/0005-use-container-apps-for-the-development-gallery.md).
The preflight used these USD retail estimates before free allowances.

| Meter | Estimate |
| --- | ---: |
| Container Apps, one replica active for 48 hours and 1,000 requests | $1.82 |
| Basic image registry, up to three billed days | $0.50 |
| Hot LRS fixture storage and Blob operations | <$0.01 |
| Visitor transfer, up to 100 MB | <$0.01 |
| Log ingestion and retention, with log storage disabled | $0 |
| Existing B1 compute during the 48-hour overlap | $3.60 |

Incremental trial charges were estimated at US$2.34. The estimate with
the B1 compute overlap was US$5.94, plus continuing production storage
and transfer. The live gallery was left on B1.

## Open the screen preview and published original

The full visitor journey in [ticket #24](https://github.com/Votok/pokuk-next/issues/24)
and [spec #22](https://github.com/Votok/pokuk-next/issues/22) passed on
November 24, 2026. Chromium used the app endpoint and invented fixture from
#23 on the build recorded above. The journey also passed at the
revision-specific endpoint for `pokuk-smoke--bba6beb-v2`.

1. Opened **Tři barvy** from the index and verified its heading and one
   411 × 640 photo tile matching the invented photo.
2. Selected the tile and verified that the lightbox displayed the matching
   1646 × 2560 screen preview.
3. Followed **Originál** and verified that the browser opened the exact
   original URL from the fixture catalog. The HTTP response contained the
   same JPEG bytes as the fixture original. Chromium reported natural
   dimensions of 1800 × 2800, matching the fixture dimensions after EXIF
   orientation.

The first revision-specific attempt timed out waiting for the lightbox.
The repeat passed all steps after the event page finished loading.

## Development deployment from main

[Ticket #28](https://github.com/Votok/pokuk-next/issues/28) uses this
isolated app and invented catalog to study deployment. The maintainer
confirmed that the available Azure credit covers the exercise. The app
scales to zero, serves fixture images and previews, and uses its system
identity for Blob access. B1 continues serving the public gallery.

The Gallery workflow checks each push to `main` before building the Linux
image. It runs the packaged image against an invented catalog before
publishing, deploys the tested digest, and reports the commit, image,
revision and endpoint in the run summary. Pull requests run the existing
checks with no Azure credentials.

To enable development deployment, configure the GitHub environment
`azure-development` to allow deployments from `main` only. Create a
dedicated Azure deployment identity with a federated credential for
`repo:Votok/pokuk-next:environment:azure-development`. Grant that identity
Container Apps Contributor at the development app and AcrPush at the
development registry. Set the environment variables
`AZURE_DEVELOPMENT_CLIENT_ID`, `AZURE_DEVELOPMENT_TENANT_ID`,
`AZURE_DEVELOPMENT_SUBSCRIPTION_ID`, `AZURE_DEVELOPMENT_APP`,
`AZURE_DEVELOPMENT_RESOURCE_GROUP`, `AZURE_DEVELOPMENT_REGISTRY`, and
`AZURE_DEVELOPMENT_REGISTRY_SERVER`. The app and registry share a resource
group. Set the repository Actions variable
`AZURE_DEVELOPMENT_DEPLOY_ENABLED` to `true` to enable the job.

The deployment identity publishes the image and updates the app. The
registry pull identity obtains that image for Container Apps. The running
Next.js server uses a separate system identity to check the catalog on each
page open and generate previews on request. The preview signing key stays
in a Container Apps secret.

### Development revision verified on November 24, 2026

- Local `main` commit `3f7b1d389c07d14bf985f16bd9673521974ade3c` passed
  lint, formatting, strict type checks, the build and all seven tests.
  The Linux image rendered the deployment fixture locally before publication.
- The registry and Azure revision both reported image digest
  `sha256:cff7983a660766628e2614d1a4b04c1b36041ad95eee71a568a37168c1a1a2c4`.
- [Revision `pokuk-smoke--dev-3f7b1d3`](https://pokuk-smoke--dev-3f7b1d3.agreeablebush-fe2aa1f3.westeurope.azurecontainerapps.io/)
  was healthy with zero minimum replicas. This was a manual deployment
  using the checked image.
- Chromium opened **Tři barvy** from the revision's index. The matching
  tile and screen preview measured 411 × 640 and 1646 × 2560. Following
  **Originál** opened the exact catalog URL and returned bytes identical
  to the 1800 × 2800 fixture original after orientation.
- The private preview container held zero blobs before the check and two
  after it. The running revision used its system identity to read the
  fixture sources and write those previews. Azure supplied the signing
  key from the existing Container Apps secret.

Publishing and verifying the GitHub Actions OIDC deployment is pending.
