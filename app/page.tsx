import { eventUrl, openCatalog } from "../lib/catalog";
import { Unavailable } from "./unavailable";

export const dynamic = "force-dynamic";

export default async function Index() {
  const years = await openCatalog();
  if (!years) return <Unavailable href="/" />;
  return (
    <>
      <h1>Pokuk</h1>
      {years.map(({ year, events }) => (
        <section key={year}>
          <h2>{year}</h2>
          <div className="cards">
            {events.map(({ name, title, photos }) => (
              <a className="card" key={name} href={eventUrl(year, name)}>
                {photos.length ? (
                  <img loading="lazy" src={photos[0].small} alt="" />
                ) : (
                  <span className="empty">Bez nahledu</span>
                )}
                <h3>{title}</h3>
                <span>{photos.length} fotek</span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
