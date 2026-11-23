import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { link, readFile, rename, writeFile } from "node:fs/promises";
import { browserFor, gallery } from "./gallery-server.mjs";

const currentEvent = "/event?year=2031&name=V%C3%BDlet+%26+t%C5%99i";

async function waitForZoom(page, photo) {
  await page.waitForFunction(
    (image) => image.getBoundingClientRect().width > image.offsetWidth + 10,
    await photo.elementHandle(),
  );
}

test("visitors can retry the same index or event URL after a catalog outage", async (t) => {
  const { dir, start } = await gallery(t);
  const catalog = path.join(dir, "catalog.json");
  const offline = path.join(dir, "offline.json");
  const base = await start();
  const browser = await browserFor(t);
  const index = await browser.newPage({ javaScriptEnabled: false });
  const event = await browser.newPage({ javaScriptEnabled: false });
  const pages = [
    [index, base + "/"],
    [event, base + currentEvent],
  ];

  for (const state of ["cold", "warm"]) {
    await rename(catalog, offline);
    for (const [page, url] of pages) {
      await page.goto(url);
      assert.equal(page.url(), url, state);
      assert.equal(
        await page.getByRole("heading", { level: 1 }).textContent(),
        "Galerie je dočasně nedostupná",
        state,
      );
      assert.equal(await page.getByText("Tři barvy", { exact: true }).count(), 0, state);
    }

    await rename(offline, catalog);
    for (const [page, url] of pages) {
      await page.getByRole("link", { name: "Zkusit znovu", exact: true }).click();
      assert.equal(page.url(), url, state);
      assert.ok(await page.getByRole("heading", { name: "Tři barvy", exact: true }).isVisible());
    }
    assert.equal(await event.title(), "Tři barvy");
  }
});

test("browse years, open empty events and resolve exact shared event URLs", async (t) => {
  const { dir, start } = await gallery(t);
  const catalog = path.join(dir, "catalog.json");
  const data = JSON.parse(await readFile(catalog, "utf8"));
  // A three-digit year distinguishes numeric from string ordering.
  data.Years.unshift({ Year: 999, GalleryEvents: [] });
  await writeFile(catalog, JSON.stringify(data));

  const base = await start();
  const browser = await browserFor(t);
  const page = await browser.newPage({ javaScriptEnabled: false });
  page.setDefaultTimeout(10000);

  await page.goto(base);
  assert.deepEqual(await page.getByRole("heading", { level: 2 }).allTextContents(), [
    "2031",
    "2030",
    "999",
  ]);
  for (const [year, titles] of [
    ["2031", ["Tři barvy", "Zcela prázdné album"]],
    ["2030", ["Minulý výlet"]],
  ]) {
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { level: 2, name: year, exact: true }),
    });
    assert.deepEqual(await section.getByRole("heading", { level: 3 }).allTextContents(), titles);
  }

  const previous = "/event?year=2030&name=V%C3%BDlet+%26+t%C5%99i";
  const card = page.getByRole("link", { name: "Tři barvy 3 fotek", exact: true });
  assert.equal(await card.getAttribute("href"), currentEvent);
  const cover = await card.locator("img").getAttribute("src");
  const previousCard = page.getByRole("link", { name: "Minulý výlet 1 fotek", exact: true });
  assert.equal(await previousCard.getAttribute("href"), previous);
  const previousCover = await previousCard.locator("img").getAttribute("src");

  const empty = page.getByRole("link", {
    name: "Bez nahledu Zcela prázdné album 0 fotek",
    exact: true,
  });
  assert.equal(await empty.locator("img").count(), 0);
  await empty.click();
  assert.equal(await page.getByRole("heading", { level: 1 }).textContent(), "Zcela prázdné album");
  assert.ok(await page.getByText("0 fotek", { exact: true }).isVisible());
  assert.ok(await page.getByText("Bez nahledu").isVisible());
  await page.getByRole("link", { name: "Zpět" }).click();
  assert.equal(page.url(), base + "/");

  await page.goto(base + currentEvent);
  assert.equal(await page.title(), "Tři barvy");
  assert.equal(await page.getByRole("heading", { level: 1 }).textContent(), "Tři barvy");
  const first = page.locator(".grid a").first();
  assert.equal(await first.getAttribute("href"), "/originals/Zlut%C3%A1%203.jpg");
  assert.equal(await first.locator("img").getAttribute("src"), cover);

  await page.goto(base + previous);
  assert.equal(await page.title(), "Minulý výlet");
  assert.equal(await page.getByRole("heading", { level: 1 }).textContent(), "Minulý výlet");
  const previousTiles = page.locator(".grid a");
  assert.equal(await previousTiles.count(), 1);
  assert.equal(await previousTiles.getAttribute("href"), "/originals/Azurov%C3%A1.jpg");
  assert.equal(await previousTiles.locator("img").getAttribute("src"), previousCover);

  for (const url of [
    "/event?year=2031&name=v%C3%BDlet+%26+t%C5%99i",
    "/event?year=2031&name=Neznama",
    "/event?year=999&name=V%C3%BDlet+%26+t%C5%99i",
  ]) {
    await page.goto(base + url);
    await page.waitForURL(base + "/");
    assert.equal(await page.getByRole("heading", { level: 1 }).textContent(), "Pokuk");
  }
});

test("share, browse, zoom, retry one photo and open a published original", async (t) => {
  const { dir, start } = await gallery(t);
  const base = await start();
  const browser = await browserFor(t);
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);

  await page.goto(base);
  await page.getByRole("link", { name: /Tři barvy/ }).click();
  const shared = page.url();
  await page.goto(shared, { waitUntil: "networkidle" });
  assert.equal(await page.title(), "Tři barvy");
  const tiles = page.locator(".grid a");
  const originals = await tiles.evaluateAll((links) =>
    links.map((link) => link.getAttribute("href")),
  );
  assert.deepEqual(originals, [
    "/originals/Zlut%C3%A1%203.jpg",
    "/originals/Azurov%C3%A1.jpg",
    "/originals/Purpurov%C3%A1.jpg",
  ]);

  // The open event must keep working when a catalog check would fail.
  const catalog = path.join(dir, "catalog.json");
  const offline = path.join(dir, "offline.json");
  await rename(catalog, offline);
  const galleryRequests = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === base) galleryRequests.push(url.pathname);
  });

  const selectedTile = await tiles.nth(1).locator("img").getAttribute("src");
  await page.route(base + selectedTile.replace("/small/", "/screen/"), (route) => route.abort(), {
    times: 1,
  });

  await tiles.nth(1).focus();
  await page.keyboard.press("Enter");
  const viewer = page.getByRole("dialog", { name: "Prohlížeč fotek" });
  const original = viewer.getByRole("link", { name: "Originál" });
  const selected = viewer.getByRole("img", { name: "Tři barvy · 2" });
  const retry = viewer.getByRole("button", { name: "Zkusit fotku znovu" });

  await retry.click();
  await selected.evaluate((img) => img.decode());
  assert.equal(await original.getAttribute("href"), originals[1]);
  await retry.waitFor({ state: "hidden" });

  await selected.hover();
  await page.mouse.wheel(0, -180);
  await waitForZoom(page, selected);
  await viewer.getByRole("button", { name: "Oddálit" }).click();

  await page.keyboard.press("ArrowRight");
  await viewer.getByRole("img", { name: "Tři barvy · 3" }).waitFor();
  await page.keyboard.press("ArrowLeft");
  await selected.waitFor();
  await viewer.getByRole("button", { name: "Předchozí" }).click();
  await viewer.getByRole("img", { name: "Tři barvy · 1" }).waitFor();
  await viewer.getByRole("button", { name: "Další" }).click();
  await selected.waitFor();

  await page.keyboard.press("Escape");
  await page.waitForFunction(
    () => document.activeElement === document.querySelectorAll(".grid a")[1],
  );
  assert.ok(galleryRequests.every((url) => url.startsWith("/previews/")));

  await tiles.first().click();
  await viewer.getByRole("img", { name: "Tři barvy · 1" }).waitFor();
  await viewer.getByRole("button", { name: "Další" }).click();
  await selected.waitFor();
  assert.equal(await original.getAttribute("href"), originals[1]);
  await original.click();
  assert.equal(page.url(), base + originals[1]);
  assert.ok(await page.locator("img").evaluate((img) => img.naturalWidth > 0));

  await rename(offline, catalog);
  const plain = await browser.newPage({ javaScriptEnabled: false });
  for (const [index, original] of originals.entries()) {
    await plain.goto(shared);
    assert.equal(await plain.title(), "Tři barvy");
    assert.equal(await plain.getByRole("heading", { level: 1 }).textContent(), "Tři barvy");

    await plain.locator(".grid a").nth(index).click();
    assert.equal(plain.url(), base + original);
    assert.equal(await plain.locator("img").evaluate((image) => image.naturalWidth > 0), true);
  }

  await plain.goto(shared);
  await plain.getByRole("link", { name: "Zpět" }).click();
  assert.equal(plain.url(), base + "/");
});

test("a phone loads nearby covers and tiles, reserves rows and opens an upright portrait", async (t) => {
  const { dir, start } = await gallery(t);
  const file = path.join(dir, "catalog.json");
  const data = JSON.parse(await readFile(file, "utf8"));
  const album = data.Years[1].GalleryEvents[1];
  const [portraitPhoto, blue, purple] = album.Files;
  album.Files = [blue, portraitPhoto, purple];

  for (let i = 0; i < 90; i++) {
    const name = "Barva-" + i + ".jpg";
    await link(
      path.join(dir, "originals", portraitPhoto.AzureLikeFileName),
      path.join(dir, "originals", name),
    );
    const photo = { ...portraitPhoto, AzureLikeFileName: name, AzureFullUlr: "/originals/" + name };
    album.Files.push(photo);
    data.Years[1].GalleryEvents.push({ Name: "B" + i, FriendlyName: "Barva " + i, Files: [photo] });
  }

  await writeFile(file, JSON.stringify(data));
  const base = await start();
  const browser = await browserFor(t);
  const viewport = { width: 390, height: 760 };
  const deviceScaleFactor = 3;
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor,
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

  await images.nth(1).scrollIntoViewIfNeeded();
  await page.waitForLoadState("networkidle");
  assert.ok(![...requests].some((url) => url.startsWith("/previews/screen/")));
  await images.nth(1).tap();
  const viewer = page.getByRole("dialog");
  const portrait = viewer.getByRole("img", { name: "Tři barvy · 2" });
  await portrait.evaluate((img) => img.decode());
  assert.match(await portrait.getAttribute("src"), /^\/previews\/screen\//);
  const { naturalWidth, naturalHeight, width, height, x, y } = await portrait.evaluate((img) => ({
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    ...img.getBoundingClientRect().toJSON(),
  }));
  assert.ok(naturalHeight > naturalWidth);
  assert.ok(Math.abs(width / height - naturalWidth / naturalHeight) < 0.01);
  assert.ok(x >= 0 && y >= 0 && x + width <= viewport.width && y + height <= viewport.height);
  assert.ok(
    naturalWidth >= width * deviceScaleFactor && naturalHeight >= height * deviceScaleFactor,
  );

  const touch = await page.context().newCDPSession(page);
  const gesture = (type, points) =>
    touch.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map(([x, y], id) => ({ x, y, id })),
    });
  await gesture("touchStart", [[305, 390]]);
  for (const x of [270, 225, 180, 125, 80]) await gesture("touchMove", [[x, 390]]);
  await gesture("touchEnd", []);

  const landscape = viewer.getByRole("img", { name: "Tři barvy · 3" });
  await landscape.evaluate((img) => img.decode());
  await viewer.getByRole("button", { name: "Přiblížit" }).and(page.locator(":enabled")).waitFor();
  await landscape.tap({ trial: true });

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
  await waitForZoom(page, landscape);
  assert.ok(![...requests].some((url) => url.startsWith("/originals/")));
});
