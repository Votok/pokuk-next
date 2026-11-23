# Keep the published JSON catalog at web cutover

The .NET uploader will still publish events when the Next.js gallery launches.
Both galleries will read the existing JSON catalog in Azure Blob Storage.
This keeps a single publisher and allows the operator to switch back to the
legacy gallery without converting data or moving photos.

The Next.js index and event pages use a server-only catalog reader. It lists
event cards by year and looks up an event by year and exact name. It preserves
covers, photo order and original URLs. Only visitor-facing fields reach the
browser. Local filesystem paths stay private.

The local manifest holds several thousand photos in roughly one megabyte.
Production read latency is unmeasured. Measure cold catalog reads against the
page-load budget and revisit versioned JSON or an index if those reads miss
the budget. If cross-device favorites become a requirement, evaluate a separate
store for visitor-owned data.

The maintainer approved this design in [Choose JSON or a database for the published gallery catalog](https://github.com/Votok/pokuk-next/issues/12#issuecomment-7085873278).
