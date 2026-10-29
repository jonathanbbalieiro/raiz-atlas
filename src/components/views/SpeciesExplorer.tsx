"use client";

import Link from "next/link";
import { Carousel } from "@/components/panel/Carousel";
import { SpeciesPhoto } from "@/components/panel/SpeciesPhoto";
import type { Biodiversity, IucnCategory, SpeciesCard } from "@/lib/data/types";
import { mergeSpecies } from "@/lib/species-search";

export const IUCN_LABEL: Partial<Record<IucnCategory, string>> = {
  CR: "Criticamente em perigo", EN: "Em perigo", VU: "Vulnerável",
  NT: "Quase ameaçada", DD: "Dados insuficientes", EW: "Extinta na natureza", EX: "Extinta",
};
export const IUCN_TONE: Partial<Record<IucnCategory, string>> = {
  CR: "bg-[#9b2c1f] text-white", EN: "bg-[#c2522d] text-white", VU: "bg-[#d99a2b] text-ink",
  NT: "bg-paper-deep text-ink", DD: "bg-paper-deep text-ink-soft",
};
type Flagship = { scientificName: string; name: string; why: string; card: SpeciesCard | null; sources: { id: string; institution: string; url: string }[] };

const taxonKey = (name: string) => name.trim().toLowerCase();
export const speciesHref = (exploreHref: string, scientificName: string) => `${exploreHref}#especie=${encodeURIComponent(scientificName)}`;
const CARD = "w-60 shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-card";

/**
 * Prévia de leitura em carrossel: primeiro os destaques editoriais, com
 * justificativa e fontes; depois as demais espécies da seleção, na ordem do
 * levantamento, marcadas como registro (não como escolha editorial). A busca e
 * os filtros continuam no explorador ampliado.
 */
export function SpeciesExplorer({ bio, flagships, exploreHref }: { bio: Biodiversity; flagships: Flagship[]; exploreHref?: string }) {
  const everyone = mergeSpecies([...bio.groups.flatMap((group) => group.species), ...bio.threatened]);
  const editorial = new Set(flagships.map((f) => taxonKey(f.scientificName)));
  const recorded = everyone.filter((s) => !editorial.has(taxonKey(s.scientificName)));
  const total = recorded.length + flagships.length;
  if (!total) return null;

  return (
    <Carousel label="Espécies do parque" className="-mx-5 mt-4 snap-x snap-mandatory scroll-px-5 gap-3 px-5 pb-1">
      {flagships.map((species) => (
        <li key={species.scientificName} className={`${CARD} relative`}>
          <div className="relative">
            <SpeciesPhoto photo={species.card?.photo} name={species.name} sizes="240px" />
            <IucnBadge iucn={species.card?.iucn} />
          </div>
          <div className="p-3.5">
            <p className="text-[10px] font-semibold tracking-[0.12em] text-earth uppercase">Destaque</p>
            <p className="mt-1 font-display text-lg leading-tight font-semibold text-forest-deep">{exploreHref ? <Link href={speciesHref(exploreHref, species.scientificName)} scroll={false} className="after:absolute after:inset-0 hover:underline">{species.name}</Link> : species.name}</p>
            <p className="mt-0.5 text-xs italic text-ink-soft">{species.scientificName}</p>
            <p className="mt-2 text-[13px] leading-relaxed text-ink">{species.why}</p>
            {species.sources.length > 0 && <p className="mt-2 text-[10px] leading-relaxed text-ink-soft">
              {species.sources.map((source, index) => <span key={source.id}>{index > 0 && " · "}<a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">{source.institution}</a></span>)}
            </p>}
            {species.card?.photo && <PhotoCredit photo={species.card.photo} />}
          </div>
        </li>
      ))}
      {recorded.map((species) => (
        <li key={species.gbifKey} className={`${CARD} relative`}>
          <div className="relative">
            <SpeciesPhoto photo={species.photo} name={species.name ?? species.scientificName} sizes="240px" />
            <IucnBadge iucn={species.iucn} />
          </div>
          <div className="p-3.5">
            <p className="font-display text-lg leading-tight font-semibold text-forest-deep">{exploreHref ? <Link href={speciesHref(exploreHref, species.scientificName)} scroll={false} className="after:absolute after:inset-0 hover:underline">{species.name ?? species.scientificName}</Link> : (species.name ?? species.scientificName)}</p>
            {species.name && <p className="mt-0.5 text-xs italic text-ink-soft">{species.scientificName}</p>}
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              {typeof species.records === "number" && species.records > 0
                ? `Registrada no levantamento: ${species.records} ${species.records === 1 ? "registro" : "registros"} na área consultada.`
                : "Registrada no levantamento da área consultada."}
            </p>
            {species.photo && <PhotoCredit photo={species.photo} />}
          </div>
        </li>
      ))}
      {exploreHref && (
        <li className="w-48 shrink-0 snap-start">
          <Link href={exploreHref} scroll={false}
            className="flex h-full min-h-40 flex-col justify-center rounded-2xl border border-forest/30 bg-card p-4 text-sm font-semibold text-forest hover:bg-moss/15">
            Conhecer as {total} espécies em detalhes
            <span aria-hidden="true" className="mt-2 text-lg">→</span>
          </Link>
        </li>
      )}
      <li aria-hidden="true" className="w-2 shrink-0" />
    </Carousel>
  );
}

export function IucnBadge({ iucn }: { iucn?: IucnCategory | null }) {
  if (!iucn || !IUCN_TONE[iucn]) return null;
  return <span title="Categoria global da Lista Vermelha da IUCN" className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${IUCN_TONE[iucn]}`}>{IUCN_LABEL[iucn]} · IUCN global</span>;
}

function PhotoCredit({ photo }: { photo: NonNullable<SpeciesCard["photo"]> }) {
  return <p className="mt-1.5 text-[10px] text-ink-soft [overflow-wrap:anywhere]">
    <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">{photo.author}</a>{" · "}
    <a href={photo.licenseUrl} target="_blank" rel="license noopener noreferrer" className="hover:underline">{photo.license}</a>
  </p>;
}
