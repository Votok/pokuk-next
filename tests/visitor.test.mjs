import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { link, readFile, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { gallery } from "./gallery-server.mjs";

async function browserFor(t) {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  t.after(() => browser.close());
  return browser;
}

test("share, browse, zoom, retry one photo and open a published original", async (t) => {
  const { start } = await gallery(t);
  const base = await start();
  const browser = await browserFor(t);
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);

  await page.goto(base);
  assert.deepEqual(await page.getByRole("heading", { level: 2 }).allTextContents(), [
    "2031",
    "2030",
  ]);
  assert.deepEqual(await page.getByRole("heading", { level: 3 }).allTextContents(), [
    "Tři barvy",
    "Prázdné album",
    "Minulý výlet",
  ]);

  const card = page.getByRole("link", { name: /Tři barvy/ });
  const cover = await card.locator("img").getAttribute("src");
  await page.getByRole("link", { name: /Bez nahledu.*Prázdné album.*0 fotek/ }).click();
  assert.ok(await page.getByText("Bez nahledu").isVisible());
  await page.getByRole("link", { name: "Zpět" }).click();

  await card.click();
  const shared = page.url();
  await page.goto(shared, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "Tři barvy");
  const tiles = page.locator(".grid a");
  assert.equal(await tiles.first().locator("img").getAttribute("src"), cover);
  const originals = await tiles.evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")),
  );
  assert.deepEqual(originals, [
    "/originals/Zlut%C3%A1%203.jpg",
    "/originals/Azurov%C3%A1.jpg",
    "/originals/Purpurov%C3%A1.jpg",
  ]);

  const selectedTile = await tiles.nth(1).locator("img").getAttribute("src");
  await page.route(base + selectedTile.replace("/small/", "/screen/"), (route) => route.abort(), {
    times: 1,
  });
  await tiles.nth(1).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Zkusit fotku znovu" }).click();

  const zoom = page.getByRole("button", { name: "Přiblížit" });
  await zoom.click();
  await page.getByRole("button", { name: "Oddálit" }).click();
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(
    (href) => document.querySelector("a.original")?.getAttribute("href") === href,
    originals[2],
  );
  await page.getByRole("button", { name: "Předchozí" }).click();
  await page.waitForFunction(
    (href) => document.querySelector("a.original")?.getAttribute("href") === href,
    originals[1],
  );
  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => document.activeElement === document.querySelectorAll(".grid a")[1],
  );

  await page.goto(shared.replace("2031", "2030"));
  assert.equal(await page.title(), "Minulý výlet");

  const plain = await browser.newPage({ javaScriptEnabled: false });
  await plain.goto(shared);
  await plain.locator(".grid a").first().click();
  assert.equal(plain.url(), base + originals[0]);
});

test("a phone loads nearby covers and tiles, reserves rows and opens an upright portrait", async (t) => {
  const { dir, start } = await gallery(t);
  const file = path.join(dir, "catalog.json");
  const data = JSON.parse(await readFile(file, "utf8"));
  const album = data.Years[1].GalleryEvents[1];
  const first = album.Files[0];

  for (let i = 0; i < 90; i++) {
    const name = "Barva-" + i + ".jpg";
    await link(
      path.join(dir, "originals", first.AzureLikeFileName),
      path.join(dir, "originals", name),
    );
    const photo = { ...first, AzureLikeFileName: name, AzureFullUlr: "/originals/" + name };
    album.Files.push(photo);
    data.Years[1].GalleryEvents.push({ Name: "B" + i, FriendlyName: "Barva " + i, Files: [photo] });
  }

  await writeFile(file, JSON.stringify(data));
  const base = await start();
  const browser = await browserFor(t);
  const page = await browser.newPage({
    viewport: { width: 390, height: 760 },
    hasTouch: true,
    isMobile: true,
  });
  const requests = new Set();
  page.on("request", (req) => requests.add(new URL(req.url()).pathname));
  page.setDefaultTimeout(10000);

  await page.goto(base);

  async function verifyLazy(selector) {
    const images = page.locator(selector);
    const distant = images.nth((await images.count()) - 6);
    const src = await distant.getAttribute("src");
    assert.ok(requests.has(await images.first().getAttribute("src")));
    assert.ok(!requests.has(src));
    const requested = page.waitForRequest((req) => new URL(req.url()).pathname === src);
    await distant.scrollIntoViewIfNeeded();
    await requested;
  }

  await verifyLazy(".card img");
  requests.clear();

  let release;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/previews/small/**", async (route) => {
    await held;
    await route.continue();
  });
  await page.getByRole("link", { name: /Tři barvy/ }).click({ noWaitAfter: true });
  const images = page.locator(".grid img");
  await images.first().waitFor();
  const row = images.nth(2);
  const before = await row.boundingBox();
  release();
  await images.first().evaluate((img) => img.decode());
  assert.equal((await row.boundingBox()).y, before.y);
  await verifyLazy(".grid img");

  await images.first().scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  await images.first().tap();
  const portrait = page.locator("img[src*='/previews/screen/']").first();
  await portrait.evaluate((img) => img.decode());
  const box = await portrait.boundingBox();
  assert.ok(box.height > box.width && box.height <= 760 && box.width <= 390);

  const touch = await page.context().newCDPSession(page);
  const gesture = (type, points) =>
    touch.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map(([x, y], id) => ({ x, y, id })),
    });
  await gesture("touchStart", [[305, 390]]);
  for (const x of [270, 225, 180, 125, 80]) await gesture("touchMove", [[x, 390]]);
  await gesture("touchEnd", []);
  await page.waitForFunction(() =>
    document.querySelector("a.original")?.getAttribute("href")?.includes("Azurov"),
  );
  const landscape = page.locator("img[src*='/previews/screen/']").filter({ visible: true }).first();
  await landscape.evaluate((img) => img.decode());
  const unzoomed = await landscape.boundingBox();

  await gesture("touchStart", [
    [155, 380],
    [235, 380],
  ]);
  for (const spread of [55, 70, 85, 100])
    await gesture("touchMove", [
      [195 - spread, 380],
      [195 + spread, 380],
    ]);
  await gesture("touchEnd", []);
  await page.waitForFunction((width) => {
    const image = document.querySelector("img[alt='Tři barvy · 2'][src*='/screen/']");
    return image && image.getBoundingClientRect().width > width + 10;
  }, unzoomed.width);
  assert.ok(![...requests].some((url) => url.startsWith("/originals/")));
});
