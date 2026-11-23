# Pokuk

Pokuk reads the .NET uploader’s published photo catalog and serves a Czech gallery with Next.js App Router.

## Run the invented gallery

Use Node.js 24. From the repository root run

```sh
npm ci
npm run fixture
GALLERY_FIXTURE_DIR=.fixture npm run dev
```

Open <http://localhost:3000>. Select **Tři barvy**, copy its URL, then open the URL in a fresh tab. Select the second tile, advance to the purple photo and open **Originál**. Try the arrow keys, Escape, wheel zoom, touch swipe and pinch. Escape should return focus to the tile you opened. With JavaScript disabled, each tile opens its original directly. The empty event and the identically named event in 2030 have their own links.

## Format code

Run `npm run format` to format gallery code. In VS Code, open
`pokuk-next.code-workspace` and install its recommended Prettier extension
for format-on-save. CI runs `npm run format:check`.

## Verify a change

```sh
npm run lint
npm run typecheck
npm run build
npx playwright-core install chromium
npm test
```

On Linux, add `--with-deps` to the browser installation command if system libraries are missing. Set `CHROMIUM_PATH` to use an existing Chrome executable. Tests start production servers on ephemeral loopback ports. A local HTTP endpoint exercises the Azure SDK's ETag handling without Azure credentials, and a browser test clicks through recovery from cold and warm outages with JavaScript disabled. The tests also use generated photos to check preview reuse after restart.

## Read the published catalog

Leave `GALLERY_FIXTURE_DIR` unset for Blob Storage. Supply the following through the server environment.

| Variable | Purpose |
| --- | --- |
| AZURE_STORAGE_CONNECTION_STRING | Server-side storage connection |
| GALLERY_CONTAINER | Existing container holding catalog and originals |
| GALLERY_CATALOG_BLOB | Existing JSON blob name |
| GALLERY_PREVIEW_CONTAINER | Separate, existing writable container for generated previews |
| GALLERY_PREVIEW_SIGNING_KEY | Random server secret shared by all gallery instances. Keep it stable across restarts and storage credential rotation so open albums retain working preview links. |

The reader issues a conditional catalog download on each page open. A matching ETag allows reuse of parsed data. If the download exceeds 10 seconds, the page offers a retry. Original links retain their exact published spelling. Each preview URL carries a signed blob name so another instance can serve an open album during a catalog outage. On a preview miss the server reads the original by its published blob name, rotates and resizes it, strips metadata, then persists the JPEG. Only the preview container receives writes. Local fixture mode uses an isolated directory for the same operations.

## Trace an event request

Open an event directly, then advance the lightbox with the Network panel open. Which action needs the latest published catalog?

1. Opening the URL runs the event Server Component. It checks the catalog revision and resolves the exact year and name. React shares the check with the document-title lookup during this render.
2. The server renders the heading and photo anchors into HTML. The grid receives only the display title and ordered preview and original links. Its props travel to the browser, so private publisher fields must be removed before this step.
3. Once React attaches the click handler, pressing an arrow changes the selected photo in browser state. The browser can request its screen preview. The event page does not render again.

Disable JavaScript and predict the destination before clicking the second tile. The existing HTML anchor still works. [Next.js guide to Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

Copy the **Tři barvy** URL and try changing just the year to `2030`, then try changing the uppercase `V` in the `name` parameter to lowercase. Next.js gives the Server Component the decoded name `Výlet & tři` for the original URL. The catalog uses both the year and the exact name to decide which event to show or whether to redirect to the index.

During an outage, **Zkusit znovu** is an HTML link that opens the same page again. Predict what happens if Blob Storage returns `304 Not Modified` on that retry. The new App Router request renders the Server Component again, and the matching ETag lets it use the parsed catalog already in memory.
