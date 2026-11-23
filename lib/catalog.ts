import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { fixture, readRevision } from "./storage";

type PublishedFile = { AzureFullUlr: string; AzureLikeFileName: string };
type PublishedEvent = { Name: string; FriendlyName: string; Files: PublishedFile[] };
type PublishedYear = { Year: number; GalleryEvents: PublishedEvent[] };

function parse(json: string) {
  const originals = new Map<string, string>();
  const { Years }: { Years: PublishedYear[] } = JSON.parse(json);
  const years = Years.sort((a, b) => b.Year - a.Year).map(year => ({
    year: year.Year,
    events: year.GalleryEvents.sort((a, b) => a.Name < b.Name ? 1 : a.Name > b.Name ? -1 : 0).map(event => ({
      name: event.Name, title: event.FriendlyName,
      photos: event.Files.map(file => {
        const original = file.AzureFullUlr;
        if (!(fixture && original.startsWith("/originals/")) && !["http:", "https:"].includes(new URL(original).protocol)) throw new Error("Invalid photo URL");
        const id = createHash("sha256").update(original).digest("hex");
        originals.set(id, file.AzureLikeFileName);
        return { id, original };
      })
    }))
  }));
  return { years, originals };
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
  try { return (await refresh()).years; } catch { return null; }
});
export async function originalName(id: string) {
  return current?.data.originals.get(id) ?? (await refresh()).originals.get(id);
}
export function eventUrl(year: number, name: string) {
  return "/event?" + new URLSearchParams({ year: String(year), name });
}
