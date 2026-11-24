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

Use the same endpoint, revision, and fixture for
[the screen preview and original check](https://github.com/Votok/pokuk-next/issues/24).
The full visitor smoke test remains open under
[spec #22](https://github.com/Votok/pokuk-next/issues/22).
