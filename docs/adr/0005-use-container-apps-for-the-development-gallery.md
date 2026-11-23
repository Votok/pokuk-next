# Use Container Apps for the development gallery

The maintainer uses the gallery for individual development and testing.
Visits can be weeks apart, and a slower first request is acceptable. The
Next.js server still needs to check the catalog when a page opens and
generate missing photo previews.

Use Azure Container Apps Consumption with zero minimum replicas as the
target host on the personal subscription. Run the first Azure smoke test
on this host while the legacy gallery serves visitors on B1. The
[App Service preflight](https://github.com/Votok/pokuk-next/issues/23#issuecomment-7113803001)
confirmed that B1 lacks deployment slots. Testing on Container Apps
verifies the target host directly. Use isolated test storage with
invented fixtures. The gallery reads
the test catalog and originals and writes generated previews.

Container Apps allows replica compute charges to stop between visits.
Before provisioning the [smoke test](https://github.com/Votok/pokuk-next/issues/22),
compare the current gallery costs with expected compute,
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
