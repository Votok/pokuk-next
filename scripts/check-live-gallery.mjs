import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";
import sharp from "sharp";

const endpoint = new URL(process.argv[2]);
const expectedRevision = process.argv[3];
const catalog = "https://pokukstorage.blob.core.windows.net/pokukcontainer/_gallery.json";
const eventTitle = "Guatemala";
const year = 2025;
const filename = "2025_Guatemala_0Z3A1428.jpg";
const originalHash = "388bfa21aa44822efd6653ba98057399ca95a86aa9842cb6a011e3f841481ae0";

async function pixels(bytes) {
  return sharp(bytes).autoOrient().resize(32, 32, { fit: "fill" }).removeAlpha().raw().toBuffer();
}

async function imageBytes(page, image) {
  await image.scrollIntoViewIfNeeded();
  await image.evaluate((element) => element.decode());
  const src = await image.evaluate((element) => element.currentSrc);
  const response = await page.request.get(src);
  assert.ok(response.ok());
  return response.body();
}

let step = "read the published catalog";
let browser;

try {
  const response = await fetch(catalog, { signal: AbortSignal.timeout(30_000) });
  assert.ok(response.ok);
  const published = await response.json();
  const event = published.Years.find((entry) => entry.Year === year).GalleryEvents.find(
    (entry) => entry.FriendlyName === eventTitle,
  );
  const original = event.Files.find((entry) => entry.AzureLikeFileName === filename).AzureFullUlr;
  assert.equal(new URL(original).protocol, "https:");

  step = "open the event from the index";
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60_000);
  assert.ok((await page.goto(endpoint.href)).ok());
  if (expectedRevision) {
    step = "verify the serving revision";
    assert.equal(
      await page.getByRole("main").getAttribute("data-gallery-revision"),
      expectedRevision,
    );
  }

  step = "open the event from the index";
  const section = page.locator("section").filter({
    has: page.getByRole("heading", { name: String(year), exact: true }),
  });
  await section
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: eventTitle, exact: true }),
    })
    .click();
  await page.getByRole("heading", { level: 1, name: eventTitle, exact: true }).waitFor();
  await page.waitForLoadState("load");

  step = "load the selected tile";
  const tiles = page.locator(".grid a");
  const index = await tiles.evaluateAll(
    (links, url) => links.findIndex((link) => link.getAttribute("href") === url),
    original,
  );
  assert.ok(index >= 0);
  const tile = tiles.nth(index);
  const tileBytes = await imageBytes(page, tile.getByRole("img"));

  step = "open the matching screen preview";
  await tile.click();
  const viewer = page.getByRole("dialog", { name: "Prohlížeč fotek" });
  const screenBytes = await imageBytes(
    page,
    viewer.getByRole("img", { name: `${eventTitle} · ${index + 1}`, exact: true }),
  );
  const sizes = await Promise.all([tileBytes, screenBytes].map((bytes) => sharp(bytes).metadata()));
  assert.ok(sizes[1].width > sizes[0].width && sizes[1].height > sizes[0].height);

  step = "follow Originál and verify the published image";
  const link = viewer.getByRole("link", { name: "Originál", exact: true });
  assert.equal(await link.getAttribute("href"), original);
  const [originalResponse] = await Promise.all([
    page.waitForResponse((item) => item.url() === new URL(original).href),
    link.click(),
  ]);
  assert.ok(originalResponse.ok());
  const originalBytes = await originalResponse.body();
  assert.equal(createHash("sha256").update(originalBytes).digest("hex"), originalHash);
  await page.locator("img").evaluate((element) => element.decode());

  step = "compare the tile and screen preview with the original";
  const expected = await pixels(originalBytes);
  for (const bytes of [tileBytes, screenBytes]) {
    const actual = await pixels(bytes);
    assert.equal(actual.length, expected.length);
    const difference = actual.reduce((sum, value, i) => sum + Math.abs(value - expected[i]), 0);
    assert.ok(difference / actual.length < 8);
  }

  const dimensions = sizes.map(({ width, height }) => `${width} × ${height}`).join(" and ");
  console.log(
    `PASS ${endpoint.origin} — ${eventTitle} (${year}), ${filename}, previews ${dimensions}, exact original URL and SHA-256`,
  );
} catch {
  console.error(`FAIL ${endpoint.origin} — could not ${step}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
}
