import { redirect } from "next/navigation";
import { findEvent } from "../../lib/catalog";
import { Unavailable } from "../unavailable";
import { Grid } from "./grid";

async function lookup(props: PageProps<"/event">) {
  const { year, name } = await props.searchParams;
  const event = await findEvent(year, name);
  if (event === undefined) redirect("/");
  return event;
}
export async function generateMetadata(props: PageProps<"/event">) {
  return { title: (await lookup(props))?.title ?? "Pokuk" };
}
export default async function Event(props: PageProps<"/event">) {
  const event = await lookup(props);
  if (!event) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await props.searchParams)) {
      for (const item of [value].flat()) if (item !== undefined) query.append(key, item);
    }
    return <Unavailable href={"/event?" + query} />;
  }
  return <><a href="/">Zpět</a><h1>{event.title}</h1><p>{event.photos.length} fotek</p>
    {event.photos.length ? <Grid title={event.title} photos={event.photos} /> : <p>Bez nahledu</p>}</>;
}
