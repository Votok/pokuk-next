"use client";
import { useMemo, useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";

type Photo = { small: string; screen: string; original: string };

export function Grid({ title, photos }: { title: string; photos: Photo[] }) {
  const [index, setIndex] = useState(-1);
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const opener = useRef<HTMLAnchorElement>(null);

  const slides = useMemo(
    () =>
      photos.map(({ screen }, i) => ({
        src: screen + (attempts[screen] ? "?retry=" + attempts[screen] : ""),
        alt: title + " · " + (i + 1),
      })),
    [title, photos, attempts],
  );

  return (
    <>
      <div className="grid">
        {photos.map(({ small, original }, i) => (
          <a
            key={i}
            href={original}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              opener.current = event.currentTarget;
              setIndex(i);
            }}
          >
            <img loading="lazy" src={small} alt={slides[i].alt} />
          </a>
        ))}
      </div>
      <Lightbox
        open={index >= 0}
        index={Math.max(0, index)}
        slides={slides}
        close={() => setIndex(-1)}
        plugins={[Zoom]}
        zoom={{ scrollToZoom: true }}
        carousel={{ preload: 0 }}
        controller={{ aria: true }}
        on={{ view: ({ index }) => setIndex(index), exited: () => opener.current?.focus() }}
        labels={{
          Lightbox: "Prohlížeč fotek",
          Carousel: "Posuvná galerie",
          "Photo gallery": title,
          Slide: "Fotka",
          "{index} of {total}": "{index} z {total}",
          Close: "Zavřít",
          Previous: "Předchozí",
          Next: "Další",
          "Zoom in": "Přiblížit",
          "Zoom out": "Oddálit",
        }}
        toolbar={{
          buttons: [
            "zoom",
            <a key="original" className="original" href={photos[index]?.original}>
              Originál
            </a>,
            "close",
          ],
        }}
        render={{
          iconError: () => (
            <button
              onClick={() => {
                const { screen } = photos[index];
                setAttempts((previous) => ({ ...previous, [screen]: (previous[screen] ?? 0) + 1 }));
              }}
            >
              Zkusit fotku znovu
            </button>
          ),
        }}
      />
    </>
  );
}
