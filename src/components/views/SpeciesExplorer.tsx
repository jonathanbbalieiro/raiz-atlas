"use client";

import { Carousel } from "@/components/panel/Carousel";
import { SpeciesPhoto } from "@/components/panel/SpeciesPhoto";
import type { Biodiversity, IucnCategory, SpeciesCard } from "@/lib/data/types";
import { mergeSpecies } from "@/lib/species-search";

export const IUCN_LABEL: Partial<Record<IucnCategory, string>> = {
  CR: "Criticamente em perigo", EN: "Em perigo", VU: "Vulnerável",
  NT: "Quase ameaçada", DD: "Dados insuficientes", EW: "Extinta na natureza", EX: "Extinta",
};
const IUCN_TONE: Partial<Record<IucnCategory, string>> = {
  CR: "bg-[#9b2c1f] text-white", EN: "bg-[#c2522d] text-white", VU: "bg-[#d99a2b] text-ink",
  NT: "bg-paper-deep text-ink", DD: "bg-paper-deep text-ink-soft",
};
type Flagship = { scientificName: string; name: string; why: string; card: SpeciesCard | null; sources: { id: string; institution: string; url: string }[] };

/** Prévia de leitura: a pesquisa e o catálogo completo pertencem ao explorador ampliado. */
export function SpeciesExplorer({ bio, flagships }: { bio: Biodiversity; flagships: Flagship[] }) {
  const everyone = mergeSpecies([...bio.groups.flatMap((group) => group.species), ...bio.threatened]);

  if (flagships.length > 0) return (
    <Carousel label="Espécies em destaque" className="-mx-5 mt-4 snap-x snap-mandatory scroll-px-5 gap-3 px-5 pb-1">
      {flagships.slice(0, 4).map((species) => (
        <li key={species.scientificName} className="w-60 shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-card">
          <div className="relative">
            <SpeciesPhoto photo={species.card?.photo} name={species.name} sizes="240px" />
            {species.card?.iucn && IUCN_TONE[species.card.iucn] && <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold ${IUCN_TONE[species.card.iucn]}`}>{IUCN_LABEL[species.card.iucn]}</span>}
          </div>
          <div className="p-3.5">
            <p className="font-display text-lg leading-tight font-semibold text-forest-deep">{species.name}</p>
            <p className="mt-0.5 text-xs italic text-ink-soft">{species.scientificName}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{species.why}</p>
            {species.sources.length > 0 && <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              {species.sources.map((source, index) => <span key={source.id}>{index > 0 && " · "}<a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">{source.institution}</a></span>)}
            </p>}
            {species.card?.photo && <PhotoCredit photo={species.card.photo} />}
          </div>
        </li>
      ))}
    </Carousel>
  );

  const firstAnimals = bio.groups.filter((group) => group.id !== "plantas").flatMap((group) => group.species).slice(0, 2);
  const firstPlants = bio.groups.find((group) => group.id === "plantas")?.species.slice(0, 2) ?? [];
  const chosen = mergeSpecies([...firstAnimals, ...firstPlants, ...everyone]).slice(0, 4);
  if (!chosen.length) return null;
  const preview = chosen.map((species) => everyone.find((entry) => entry.gbifKey === species.gbifKey) ?? species);
  return <ul className="mt-4 grid grid-cols-2 gap-3">
    {preview.map((species) => <li key={species.gbifKey} className="overflow-hidden rounded-xl border border-line bg-card">
      <SpeciesPhoto photo={species.photo} name={species.name ?? species.scientificName} />
      <div className="p-2.5"><p className="text-sm font-semibold text-forest-deep">{species.name ?? species.scientificName}</p>{species.name && <p className="mt-1 text-xs italic text-ink-soft">{species.scientificName}</p>}{species.photo && <PhotoCredit photo={species.photo} />}</div>
    </li>)}
  </ul>;
}

function PhotoCredit({ photo }: { photo: NonNullable<SpeciesCard["photo"]> }) {
  return <p className="mt-1.5 truncate text-xs text-ink-soft" title={`Foto: ${photo.author} · ${photo.license}`}>
    <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{photo.author}</a>{" · "}
    <a href={photo.licenseUrl} target="_blank" rel="license noopener noreferrer" className="hover:underline">{photo.license}</a>
  </p>;
}
