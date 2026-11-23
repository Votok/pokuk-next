# Publish approved events together

The operator may approve several new events in one publication plan. Upload
and verify every original before making those events visible in a single
catalog update. Apply the update only if the published catalog still has
the revision the operator reviewed. This lets visitors keep browsing the
previous catalog if an upload stops partway through.

On retry, the CLI can reuse an original under the same approval when it can
verify both its contents and that the plan created it. An existing blob of
uncertain ownership follows the explicit reuse policy. A change to the input
photos or catalog requires a fresh preview and approval. If a catalog write
lost its acknowledgement, check the published result first. An exact match
for the complete approved change counts as success.

During transition, compare read-only TypeScript previews with what the .NET
uploader publishes. Finish active .NET uploads and disable its write access
before giving the CLI write access. Retire .NET once the CLI demonstrates
publication, recovery from interruption, and preservation of existing events
and original links. The maintainer can pause uploads while repairing the CLI.
Visitors continue to use the last valid catalog during that pause.

The maintainer approved the [publication protocol and uploader cutover](https://github.com/Votok/pokuk-next/issues/10#issuecomment-7101192006).
