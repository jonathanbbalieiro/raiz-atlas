"use client";

import { useEffect, useState } from "react";
import { useExplore, type StoryPlace } from "@/components/map/focus";
import type { ExpeditionMoment } from "@/lib/data/types";

const scrollParent = (el: HTMLElement | null): HTMLElement | Window => {
  for (let p = el?.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY;
    if ((o === "auto" || o === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return window;
};

/**
 * Barra de leitura e capítulo atual da Expedição, dentro da barra fixa do
 * topo. Observa as seções pelos ids; sem JavaScript o texto segue completo.
 */
export function ReadingProgress({ moments }: { moments: Pick<ExpeditionMoment, "id" | "title" | "map">[] }) {
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState<number | null>(null);
  const [host, setHost] = useState<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!host) return;
    const scroller = scrollParent(host);
    const read = () => {
      const [top, height, view] =
        scroller instanceof Window
          ? [window.scrollY, document.documentElement.scrollHeight, window.innerHeight]
          : [scroller.scrollTop, scroller.scrollHeight, scroller.clientHeight];
      setProgress(Math.min(1, Math.max(0, top / Math.max(1, height - view))));
      // Capítulo atual: o último cujo início já passou de 40% da altura visível.
      const base = scroller instanceof Window ? 0 : scroller.getBoundingClientRect().top;
      let idx: number | null = null;
      moments.forEach((m, i) => {
        const el = document.getElementById(m.id);
        if (el && el.getBoundingClientRect().top - base < view * 0.4) idx = i;
      });
      setCurrent(idx);
    };
    read();
    scroller.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      scroller.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }, [host, moments]);

  // O mapa acompanha o lugar do capítulo em leitura; sem lugar, volta ao parque.
  const { setStoryPlace } = useExplore();
  const map = current === null ? undefined : moments[current].map;
  const place: StoryPlace = !map ? null : "frame" in map
    ? { label: map.label, frame: map.frame }
    : { label: map.label, coordinates: map.location.coordinates, approximate: map.location.precision === "aproximado" };
  const placeKey = JSON.stringify(place);
  useEffect(() => {
    setStoryPlace(JSON.parse(placeKey) as StoryPlace);
  }, [placeKey, setStoryPlace]);
  useEffect(() => () => setStoryPlace(null), [setStoryPlace]);

  return (
    <>
      <span ref={setHost} className="ml-auto min-w-0 truncate text-right text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">
        {current === null ? "Raiz · Expedições" : `${String(current + 1).padStart(2, "0")} · ${moments[current].title}`}
      </span>
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-line">
        <div className="h-full origin-left bg-forest" style={{ transform: `scaleX(${progress})` }} />
      </div>
    </>
  );
}
