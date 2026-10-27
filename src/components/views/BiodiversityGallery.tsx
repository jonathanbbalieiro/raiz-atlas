"use client";

import { Carousel } from "@/components/panel/Carousel";
import type { Biodiversity, SpeciesCard } from "@/lib/data/types";
import { SpeciesPhoto } from "@/components/panel/SpeciesPhoto";

function uniqueByPhoto(items: SpeciesCard[]) {
  const seen = new Set<string>();
  return items.filter((s) => {
    const key = s.photo?.sourceUrl ?? `${s.scientificName}:${s.gbifKey}`;
    if (!s.photo || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function BiodiversityGallery({ bio }: { bio: Biodiversity }) {
  const plants = uniqueByPhoto(bio.groups.find((g) => g.id === "plantas")?.species ?? []).slice(0, 8);
  const animals = uniqueByPhoto(
    bio.groups.filter((g) => g.id !== "plantas").flatMap((g) => g.species).sort((a, b) => (b.records ?? 0) - (a.records ?? 0)),
  ).slice(0, 8);
  const mix = [
    ...animals.slice(0, 4).map((s) => ({ ...s, tag: "animal" })),
    ...plants.slice(0, 4).map((s) => ({ ...s, tag: "planta" })),
  ];
  if (!mix.length) return null;

  return (
    <section aria-labelledby="bio-galeria" className="pt-8">
      <div className="px-5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">Fotos de seres do parque</p>
        <h2 id="bio-galeria" className="mt-1 font-display text-[22px] leading-tight font-semibold text-balance text-forest-deep">
          Uma galeria de animais e plantas já documentados
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
          Esta seleção mostra fotografias identificadas de espécies com registros científicos no parque. A imagem pode ter sido feita em outro lugar; não representa abundância nem chance de avistamento.
        </p>
      </div>
      <Carousel label="Seres do parque" className="mt-3 snap-x snap-mandatory scroll-px-5 gap-3 px-5 pb-1">
        {mix.map((s) => (
          <li key={`${s.gbifKey}-${s.tag}`} className="w-[74%] max-w-72 shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-card">
            <div className="relative">
              <SpeciesPhoto photo={s.photo} name={s.name ?? s.scientificName} sizes="288px" />
              <span className="absolute left-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                {s.tag === "planta" ? "Planta" : "Animal"}
              </span>
            </div>
            <div className="p-3.5">
              <p className="font-display text-lg leading-tight font-semibold text-forest-deep">{s.name ?? s.scientificName}</p>
              {s.name && <p className="mt-0.5 text-[11px] italic text-ink-soft">{s.scientificName}</p>}
              {s.family && <p className="mt-1 text-[11px] text-ink-soft">Família {s.family}</p>}
              {s.records !== null && <p className="mt-1 text-[11px] text-ink-soft">{s.records} registros na base</p>}
              <p className="mt-1.5 text-[10px] leading-relaxed text-ink-soft">
                Foto: <a href={s.photo!.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{s.photo!.author}</a> · {" "}
                <a href={s.photo!.licenseUrl} target="_blank" rel="license noopener noreferrer" className="underline">{s.photo!.license}</a>
              </p>
            </div>
          </li>
        ))}
        <li aria-hidden="true" className="w-2 shrink-0" />
      </Carousel>
    </section>
  );
}
