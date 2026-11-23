import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { gallery } from "./gallery-server.mjs";

const event = "/event?year=2031&name=V%C3%BDlet+%26+t%C5%99i";
test("each page checks the published revision and offers same-page recovery", async t => {
  const { dir, start } = await gallery(t);
  const catalog = path.join(dir, "catalog.json");
  const published = JSON.parse(await readFile(catalog, "utf8"));
  const base = await start();
  const page = async url => (await fetch(base + url)).text();
  for (const state of ["cold", "warm"]) {
    await rename(catalog, catalog + ".offline");
    for (const url of ["/", event]) {
      const html = await page(url);
      assert.match(html, /Galerie je dočasně nedostupná/);
      assert.ok(html.includes('href="' + url.replace("&", "&amp;") + '"'), state);
      assert.doesNotMatch(html, /Tři barvy/);
    }
    await rename(catalog + ".offline", catalog);
    assert.match(await page(event), /<title>Tři barvy<\/title>/);
    assert.match(await page("/"), /Tři barvy/);
  }
  published.Years[1].GalleryEvents.push({ Name: "Z", FriendlyName: "Nová událost", Files: [] });
  await writeFile(catalog, JSON.stringify(published));
  assert.match(await page("/event?year=2031&name=Z"), /<h1>Nová událost<\/h1>/);
  assert.match(await page("/"), /Nová událost/);
  const unknown = await fetch(base + "/event?year=2031&name=z", { redirect: "manual", headers: { "user-agent": "Googlebot" } });
  assert.equal(unknown.headers.get("location"), "/");
});

test("upright private-metadata-free previews survive replacement of the gallery process", async t => {
  const { dir, start } = await gallery(t);
  let base = await start();
  const html = await (await fetch(base + event)).text();
  assert.doesNotMatch(html, /FullFileName|invented\/private|Invented Camera|2031:04:03|GPSLatitude/);
  const tiles = [...html.matchAll(/<img[^>]+src="(\/previews\/small\/[^"]+)"/g)].map(match => match[1]);
  const tile = tiles[0];
  assert.equal((await fetch(base + tile.replace("/small/", "/small/eA"))).status, 404);
  await rename(path.join(dir, "catalog.json"), path.join(dir, "offline.json"));
  base = await start();
  assert.equal((await fetch(base + tiles[1].replace("small", "screen"))).status, 200);
  const original = "/originals/Zlut%C3%A1%203.jpg";
  const bytes = async url => Buffer.from(await (await fetch(base + url)).arrayBuffer());
  const before = await bytes(original);
  const source = await sharp(before).metadata();
  assert.equal(source.orientation, 6);
  assert.ok(source.exif.includes(Buffer.from("Invented Camera")));
  assert.ok(source.exif.includes(Buffer.from("2031:04:03")));
  const previews = new Map();
  for (const [size, height] of [["small", 640], ["screen", 2560]]) {
    const url = tile.replace("small", size);
    const data = await bytes(url);
    const image = await sharp(data).metadata();
    assert.equal(image.height, height);
    assert.ok(Math.abs(image.width / image.height - 1800 / 2800) < .002);
    assert.equal(image.exif, undefined);
    previews.set(url, data);
  }
  assert.deepEqual(await bytes(original), before);
  await rename(path.join(dir, "originals"), path.join(dir, "offline"));
  base = await start();
  for (const [url, data] of previews) assert.deepEqual(await bytes(url), data);
});
