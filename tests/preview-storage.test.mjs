import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import sharp from "sharp";
import { gallery, serveLocally } from "./gallery-server.mjs";

test("Blob previews reuse the saved bytes when another instance writes first", async (t) => {
  const { dir, start } = await gallery(t);
  const name = "Zlutá 3.jpg";
  const competingName = "Druhá 3.jpg";
  const original = await readFile(path.join(dir, "originals", name));
  const files = [name, competingName].map((blobName) => ({
    AzureLikeFileName: blobName,
    AzureFullUlr: "https://example.invalid/gallery/" + encodeURIComponent(blobName),
  }));
  const catalog = JSON.stringify({
    Years: [
      {
        Year: 2031,
        GalleryEvents: [
          {
            Name: "Vylet",
            FriendlyName: "Výlet",
            Files: files,
          },
        ],
      },
    ],
  });

  const competingScreen = await sharp(original)
    .autoOrient()
    .resize(2560, 2560, { fit: "inside" })
    .jpeg({ quality: 70 })
    .toBuffer();

  const previews = new Map();
  const writes = [];
  let originalAvailable = true;
  let competingWrite = false;

  const blobEndpoint = await serveLocally(t, async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const preview = pathname.startsWith("/account/previews/");

    if (request.method === "PUT") {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      writes.push({
        pathname,
        condition: request.headers["if-none-match"],
        contentType: request.headers["x-ms-blob-content-type"],
      });

      if (!preview) {
        response.writeHead(403, { "x-ms-error-code": "AuthorizationFailure" }).end();
      } else if (competingWrite) {
        previews.set(pathname, competingScreen);
        response.writeHead(412, { "x-ms-error-code": "ConditionNotMet" }).end();
      } else {
        previews.set(pathname, Buffer.concat(chunks));
        response.writeHead(201).end();
      }
      return;
    }

    let bytes = previews.get(pathname);
    if (pathname === "/account/gallery/published.json") bytes = Buffer.from(catalog);
    if (
      originalAvailable &&
      [name, competingName].some((blobName) => pathname === `/account/gallery/${blobName}`)
    ) {
      bytes = original;
    }
    if (!bytes) {
      response.writeHead(404, { "x-ms-error-code": "BlobNotFound" }).end();
      return;
    }

    const headers = { etag: '"fixture"', "content-length": bytes.length };
    if (request.headers["x-ms-range"]) {
      response.writeHead(206, {
        ...headers,
        "content-range": `bytes 0-${bytes.length - 1}/${bytes.length}`,
      });
    } else {
      response.writeHead(200, headers);
    }
    response.end(request.method === "HEAD" ? undefined : bytes);
  });

  const env = {
    GALLERY_FIXTURE_DIR: "",
    AZURE_STORAGE_CONNECTION_STRING:
      `BlobEndpoint=${blobEndpoint}/account;` +
      "AccountName=account;SharedAccessSignature=sp=rcw&sig=invented",
    GALLERY_CONTAINER: "gallery",
    GALLERY_CATALOG_BLOB: "published.json",
    GALLERY_PREVIEW_CONTAINER: "previews",
    GALLERY_PREVIEW_SIGNING_KEY: "invented-signing-key",
  };
  let base = await start(env);
  const html = await (await fetch(base + "/event?year=2031&name=Vylet")).text();
  assert.ok(html.includes(`href="${files[0].AzureFullUlr}"`));
  assert.equal(writes.length, 0);
  const [small, secondSmall] = Array.from(
    html.matchAll(/<img[^>]+src="(\/previews\/small\/[^"]+)"/g),
    (match) => match[1],
  );
  const screen = small.replace("/small/", "/screen/");
  const secondScreen = secondSmall.replace("/small/", "/screen/");

  async function download(url) {
    const response = await fetch(base + url);
    assert.equal(response.status, 200);
    return Buffer.from(await response.arrayBuffer());
  }

  const savedSmall = await download(small);
  assert.equal(writes.length, 1);
  assert.deepEqual(savedSmall, previews.get(writes[0].pathname));

  const savedScreen = await download(screen);
  assert.equal(writes.length, 2);
  assert.deepEqual(savedScreen, previews.get(writes[1].pathname));

  competingWrite = true;
  assert.ok(
    (await download(secondScreen)).equals(competingScreen),
    "serve the stored screen preview",
  );
  assert.equal(writes.length, 3);
  for (const { pathname, condition, contentType } of writes) {
    assert.ok(pathname.startsWith("/account/previews/"));
    assert.equal(condition, "*");
    assert.equal(contentType, "image/jpeg");
  }

  originalAvailable = false;
  base = await start(env);
  assert.deepEqual(await download(small), savedSmall);
  assert.deepEqual(await download(screen), savedScreen);
  assert.deepEqual(await download(secondScreen), competingScreen);
  assert.equal(writes.length, 3);
});
