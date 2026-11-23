# Check the published catalog when a gallery page opens

An operator can share an event link as soon as the uploader publishes it.
When a visitor opens the index or an event link, the Next.js server checks
the catalog in Blob Storage. It can reuse a parsed copy once Azure confirms
that the revision is current. This costs a storage round trip per page
request. Build-time rendering would tie publication to a rebuild, while a
timed refresh could send a visitor home after they open a valid new link.

If the catalog check fails, show a temporary-unavailable page and invite the
visitor to retry. This also applies when the server has an older copy. A
successful check that confirms an unknown event still redirects home.

The event page passes ordered photos and preview URLs to the browser.
The lightbox handles clicks, swipes and arrow keys without rechecking the
catalog. If a photo fails to load, keep the album open and let the visitor
retry that photo.

The maintainer approved this behavior in [Choose where gallery pages render and when they refresh](https://github.com/Votok/pokuk-next/issues/7#issuecomment-7085990217).
