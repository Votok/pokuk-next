# Add new events during routine publication

An operator's local gallery can be incomplete, and visitors can bookmark both
events and original photo URLs. The published catalog owns each visible event's
identity (year and exact name), title, photo order, cover and original URLs.
The local folder scan supplies publication candidates. Its generated manifest
records what was present at scan time. The stored blob supplies the photo bytes.

Routine publication adds genuinely new events with unambiguous identities and
unused blob keys. A read-only preview compares the local scan, its snapshot,
the published catalog and the relevant blobs. Changes to a published event
require an explicitly approved edit. A possible event rename requires the
operator to confirm intent. An item missing locally stays published.

Keep unreferenced blobs because visitors may have direct links to them. Reusing
one requires explicit approval and verified identical bytes. A missing published
blob can be restored at its original key with approval and verified original
bytes. Conflicting or unverified keys block the affected item. Distinct photos
that claim the same key need distinct keys even when their bytes match.

This preserves shared links through incomplete scans and interrupted uploads.
The operator reviews intentional corrections separately from routine additions.
The decision and comparison cases are recorded in [Decide what the uploader may publish when local and Azure state differ](https://github.com/Votok/pokuk-next/issues/6#issuecomment-7085657414).
