# Use Container Apps for the development gallery

The maintainer uses the gallery for individual development and testing.
Visits can be weeks apart, and a slower first request is acceptable. The
Next.js server still needs to check the catalog when a page opens and
generate missing photo previews.

Use Azure Container Apps Consumption with zero minimum replicas as the
target host on the existing subscription. The existing App Service can
host tests before the move. This avoids maintaining a separate Azure test
app. Use isolated test storage with invented fixtures. The gallery reads
the test catalog and originals and writes generated previews.

Reusing the current App Service plan is convenient for testing. Moving
to Container Apps allows replica compute charges to stop between visits.
Before switching, compare the current gallery costs with expected compute,
storage, transfer, logging and registry charges. Include any period of
overlap with App Service and verify that the credit and spending limit
cover the intended use. The budget allows zero additional out-of-pocket
spend.

GitHub Actions runs lint, strict TypeScript checks, tests with invented
fixtures and a Next.js build on pull requests and pushes to `main`.
Pull request checks run without Azure credentials. At the maintainer's
chosen handoff, save the working legacy build and configuration and
disconnect its deployment trigger before enabling the new one. Each
passing `main` build then deploys automatically. The deployment job uses
a short-lived Azure token obtained through GitHub OIDC. The uploader
retains responsibility for publishing photos and the catalog.

Smoke-test the gallery after deployment. If that check fails, the
maintainer can restore the previous working build and configuration.
On Container Apps, retain the previous working revision for rollback.

The maintainer approved the hosting decision in
[Choose the Azure host and production access boundaries](https://github.com/Votok/pokuk-next/issues/9#issuecomment-7086287050)
and confirmed the [deployment handoff and rollback](https://github.com/Votok/pokuk-next/issues/9#issuecomment-7086346471).
