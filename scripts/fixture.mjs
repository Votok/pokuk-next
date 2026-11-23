import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const albumName = "Výlet & tři";
export async function seed(dir) {
  const originals = path.join(dir, "originals");
  await mkdir(originals, { recursive: true });
  const names = ["Zlutá 3.jpg", "Azurová.jpg", "Purpurová.jpg"];
  const colors = ["#e7b33a", "#238a99", "#9e386e"];
  const files = [];
  for (const [i, name] of names.entries()) {
    const drawing = Buffer.from(`<svg width="2800" height="1800" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${colors[i]}"/><circle cx="850" cy="700" r="490" fill="#ffedc8"/><path d="M0 1800 L1800 850 L2800 1450 V1800" fill="#23373f"/></svg>`);
    await sharp(drawing).jpeg().withMetadata({ orientation: i === 0 ? 6 : 1 })
      .withExifMerge({ IFD0: { Model: "Invented Camera" }, IFD2: { DateTimeOriginal: "2031:04:03 02:01:00" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "51/1 12/1 34/1" } })
      .toFile(path.join(originals, name));
    files.push({ AzureLikeFileName: name, AzureFullUlr: "/originals/" + encodeURIComponent(name), FullFileName: "/invented/private/" + name });
  }
  const album = { Name: albumName, FriendlyName: "Tři barvy", Files: files };
  await writeFile(path.join(dir, "catalog.json"), JSON.stringify({ Years: [
    { Year: 2030, GalleryEvents: [{ ...album, FriendlyName: "Minulý výlet" }] },
    { Year: 2031, GalleryEvents: [{ Name: "Álbum", FriendlyName: "Prázdné album", Files: [] }, album] }
  ] }));
}
if (import.meta.main) await seed(process.env.GALLERY_FIXTURE_DIR || ".fixture");
