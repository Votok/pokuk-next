import "server-only";
import { previewUrls } from "./preview-url";
import { cache } from "react";
import { fixture, readRevision } from "./storage";

type PublishedFile = { AzureFullUlr: string; AzureLikeFileName: string };
type PublishedEvent = { Name: string; FriendlyName: string; Files: PublishedFile[] };
type PublishedYear = { Year: number; GalleryEvents: PublishedEvent[] };

function parse(json: string) {
  const byName = new Intl.Collator("cs");
  const { Years }: { Years: PublishedYear[] } = JSON.parse(json);
  return Years.sort((a, b) => b.Year - a.Year).map(year => ({
    year: year.Year,
    events: year.GalleryEvents.sort((a, b) => byName.compare(b.Name, a.Name)).map(event => ({
      name: event.Name, title: event.FriendlyName,
      photos: event.Files.map(file => {
        const original = file.AzureFullUlr;
        if (!(fixture && original.startsWith("/originals/")) && !["http:", "https:"].includes(new URL(original).protocol)) throw new Error("Invalid photo URL");
        return { original, ...previewUrls(file.AzureLikeFileName) };
      })
    }))
  }));
}
let current: { revision: string; data: ReturnType<typeof parse> } | undefined;
async function refresh() {
  const previous = current;
  const response = await readRevision(previous?.revision);
  if (!response && previous) return previous.data;
  if (!response) throw new Error("Missing revision");
  const data = parse(response.json);
  current = { revision: response.revision, data };
  return data;
}
export const openCatalog = cache(async () => {
  try { return await refresh(); } catch { return null; }
});
export const findEvent = cache(async (year: string | string[] | undefined, name: string | string[] | undefined) => {
  const years = await openCatalog();
  if (!years) return null;
  return years.find(entry => String(entry.year) === year)?.events.find(entry => entry.name === name);
});
export function eventUrl(year: number, name: string) {
  return "/event?" + new URLSearchParams({ year: String(year), name });
}
