# Store photo previews on first request

Visits can be weeks apart, and the legacy uploader will still publish events
when the new gallery launches. Generate each preview size on its first request
and keep it in Azure Blob Storage for as long as the photo is published. The
first visitor waits for resizing. Later visitors reuse the stored preview,
even after the web app restarts.

Use a small preview for covers and grid tiles and an uncropped, screen-sized
preview for the lightbox. When catalog dimensions are missing, the grid
reserves the tile before loading. The generator reads the original's dimensions
and orientation, produces upright pixels, and omits private metadata. The
lightbox can use the preview's own dimensions.

Generating previews ahead of time would make the first view faster but would
require processing existing albums and extending the publication workflow.
On-demand generation incurs storage costs for the sizes visitors request and
allows the reader to switch over without a bulk conversion or catalog backfill.

The maintainer approved this design in [Choose how to serve photo previews and handle missing dimensions](https://github.com/Votok/pokuk-next/issues/13#issuecomment-7085810224).
