import assert from "node:assert/strict";
import { test } from "node:test";
import { rename } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import sharp from "sharp";
import { gallery } from "./gallery-server.mjs";

const event = "/event?year=2031&name=V%C3%BDlet+%26+t%C5%99i";

test("the Blob reader checks its cached ETag on every page open", async (t) => {
  const { start } = await gallery(t);
  const requests = [];
  let revision = '"first"';
  let access = "denied";
  const events = [
    {
      Name: "Prvni",
      FriendlyName: "První výlet",
      Files: [
        {
          AzureFullUlr: "https://example.invalid/photos/first.jpg",
          AzureLikeFileName: "first.jpg",
          FullFileName: "/invented/private/first.jpg",
        },
      ],
    },
  ];

  const blob = createServer((req, res) => {
    const condition = req.headers["if-none-match"];
    requests.push({
      method: req.method,
      path: new URL(req.url, "http://localhost").pathname,
      condition,
    });

    if (access === "denied") {
      res.writeHead(403, { "x-ms-error-code": "AuthorizationFailure" }).end();
    } else if (condition === revision) {
      res.writeHead(304, { etag: revision }).end();
    } else {
      const json = "\uFEFF" + JSON.stringify({ Years: [{ Year: 2031, GalleryEvents: events }] });
      res.writeHead(200, { etag: revision, "content-length": Buffer.byteLength(json) });
      if (access === "stalled") res.flushHeaders();
      else res.end(json);
    }
  });

  await new Promise((resolve, reject) => {
    blob.once("error", reject);
    blob.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => {
    blob.close();
    blob.closeAllConnections();
  });

  const base = await start({
    GALLERY_FIXTURE_DIR: "",
    AZURE_STORAGE_CONNECTION_STRING:
      `BlobEndpoint=http://127.0.0.1:${blob.address().port}/testaccount;` +
      "AccountName=testaccount;SharedAccessSignature=sp=r&sig=invented-catalog-secret",
    GALLERY_CONTAINER: "gallery",
    GALLERY_CATALOG_BLOB: "published.json",
    GALLERY_PREVIEW_SIGNING_KEY: "invented-signing-key",
  });
  const first = "/event?year=2031&name=Prvni";
  const second = "/event?year=2031&name=Druhy";

  async function openPage(url, expectedIfNoneMatch) {
    const response = await fetch(base + url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    assert.match(response.headers.get("cache-control"), /\bno-store\b/);
    const html = await response.text();
    assert.doesNotMatch(
      html,
      /invented-catalog-secret|invented-signing-key|published\.json|testaccount|FullFileName|invented\/private/,
    );

    assert.deepEqual(requests.splice(0), [
      {
        method: "GET",
        path: "/testaccount/gallery/published.json",
        condition: expectedIfNoneMatch,
      },
    ]);
    return html;
  }

  for (const condition of [undefined, '"first"']) {
    for (const url of ["/", first]) {
      const html = await openPage(url, condition);
      assert.match(html, /Galerie je dočasně nedostupná/);
      assert.doesNotMatch(html, /První výlet/);
    }

    access = "ready";
    assert.match(await openPage(first, condition), /<h1>První výlet<\/h1>/);
    assert.match(await openPage("/", '"first"'), /<h3>První výlet<\/h3>/);
    access = "denied";
  }

  revision = '"second"';
  events.push({ Name: "Druhy", FriendlyName: "Druhý výlet", Files: [] });
  access = "stalled";
  const unavailable = await openPage(second, '"first"');
  assert.match(unavailable, /Galerie je dočasně nedostupná/);
  assert.match(unavailable, />Zkusit znovu<\/a>/);

  access = "ready";
  assert.match(await openPage(second, '"first"'), /<h1>Druhý výlet<\/h1>/);
  assert.match(await openPage("/", '"second"'), /<h3>Druhý výlet<\/h3>/);

  const unknown = await fetch(base + "/event?year=2031&name=druhy", {
    redirect: "manual",
    headers: { "user-agent": "Googlebot" },
  });
  assert.equal(unknown.headers.get("location"), "/");
});

test("upright private-metadata-free previews survive replacement of the gallery process", async (t) => {
  const { dir, start } = await gallery(t);
  let base = await start();
  const html = await (await fetch(base + event)).text();
  assert.doesNotMatch(
    html,
    /FullFileName|invented\/private|Invented Camera|2031:04:03|GPSLatitude/,
  );
  const tiles = [...html.matchAll(/<img[^>]+src="(\/previews\/small\/[^"]+)"/g)].map(
    (match) => match[1],
  );
  const tile = tiles[0];
  assert.equal((await fetch(base + tile.replace("/small/", "/small/eA"))).status, 404);
  await rename(path.join(dir, "catalog.json"), path.join(dir, "offline.json"));
  base = await start();
  assert.equal((await fetch(base + tiles[1].replace("small", "screen"))).status, 200);

  const original = "/originals/Zlut%C3%A1%203.jpg";
  const bytes = async (url) => Buffer.from(await (await fetch(base + url)).arrayBuffer());
  const before = await bytes(original);
  const source = await sharp(before).metadata();
  assert.equal(source.orientation, 6);
  assert.ok(source.exif.includes(Buffer.from("Invented Camera")));
  assert.ok(source.exif.includes(Buffer.from("2031:04:03")));

  const previews = new Map();
  for (const [size, height] of [
    ["small", 640],
    ["screen", 2560],
  ]) {
    const url = tile.replace("small", size);
    const data = await bytes(url);
    const image = await sharp(data).metadata();
    assert.equal(image.height, height);
    assert.ok(Math.abs(image.width / image.height - 1800 / 2800) < 0.002);
    assert.equal(image.exif, undefined);
    previews.set(url, data);
  }

  assert.deepEqual(await bytes(original), before);
  await rename(path.join(dir, "originals"), path.join(dir, "offline"));
  base = await start();
  for (const [url, data] of previews) assert.deepEqual(await bytes(url), data);
});
