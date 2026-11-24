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

## First live deployment

[Spec #25](https://github.com/Votok/pokuk-next/issues/25) approves
Container Apps Consumption with zero minimum replicas for the first live
Next.js revision, with App Service B1 serving visitors and available for the
first rollback. The 48-hour exception applied to the invented-data trial.
Before live provisioning, verify that the overlap and ongoing costs are
covered by eligible credit and the subscription spending limit, with zero
additional out-of-pocket spend. The maintainer deferred the cost and credit
checks in [#26](https://github.com/Votok/pokuk-next/issues/26). The live
deployment remains deferred until that evidence is available and the
maintainer chooses the handoff time.

1. At the agreed handoff time, confirm the budget evidence and the
   [B1 rollback baseline](../azure-handoff-rollback.md) are current. Disconnect
   the legacy deployment trigger before enabling automatic deployment from
   `main`.
2. Give the runtime identity read access to the published catalog and
   preview source originals. Scope read and write access for cached previews
   to the generated preview container. Configure the preview signing key as
   a server-side secret. The uploader continues to publish the catalog and
   originals.
3. After the checks pass, use the authorized `main` deployment job to
   publish the tested image and deploy it by digest. Scope its short-lived
   GitHub OIDC access to the target app and required image publication.
   Record the commit, image digest, revision and candidate endpoint.
4. Run the [visitor check](../azure-handoff-rollback.md#repeat-the-visitor-check)
   on the candidate revision endpoint with the live catalog. Keep B1 serving
   the public URL while testing. Promote only after the candidate passes,
   then repeat the check on the public URL and record the result. The public
   endpoint recorded in the baseline is Azure-managed and bound to B1, so
   the switch needs a routing plan that preserves that URL.
5. If the public check fails, suspend promotion, restore B1 routing and
   restore the saved build and matching configuration as needed. Verify
   recovery at the public URL before resuming deploys. For subsequent
   releases, retain the last working Container Apps revision and its
   matching configuration. If recovery is needed, route back to it and
   repeat the public check before resuming deploys.
