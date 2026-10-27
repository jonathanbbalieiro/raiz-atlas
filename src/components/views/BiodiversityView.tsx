"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import type { Park, SpeciesCard } from "@/lib/data/types";
import { href } from "@/lib/labels";
import { filterSpecies } from "@/lib/species-search";
import { biodiversitySelections, CONSERVATION_INFO, speciesEvidenceLink } from "@/lib/species-evidence";
import { biodiversityRoster } from "@/lib/species-photos";
import Image from "@/components/panel/PhotoImage";
import { SpeciesPhoto } from "@/components/panel/SpeciesPhoto";
import { Credit } from "@/components/panel/Gallery";

export function BiodiversityView({ park }: { park: Park }) {
  const bio = park.biodiversity!;
  const guide = park.guide;
  const species = biodiversityRoster(bio, guide);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("todas");
  const [selected, setSelected] = useState(species[0]?.scientificName);
  const detailRef = useRef<HTMLElement>(null);
  const id = useId();
  const selections = biodiversitySelections(bio);
  const keys = group === "animais" ? selections.animals : group === "plantas" ? selections.plants : bio.threatened;
  const ids = new Set(keys.map((s) => s.gbifKey));
  const results = filterSpecies(group === "todas" ? species : species.filter((s) => ids.has(s.gbifKey)), query);
  const active = results.find((s) => s.scientificName === selected) ?? results[0];
  const flagship = guide?.flagships.find((f) => f.scientificName.toLowerCase() === active?.scientificName.toLowerCase());
  const conservation = active?.iucn ? CONSERVATION_INFO[active.iucn] : null;
  const evidence = active ? speciesEvidenceLink(bio, active) : null;
  const choose = (item: SpeciesCard) => {
    setSelected(item.scientificName);
    detailRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    if (window.matchMedia("(max-width: 767px)").matches) {
      detailRef.current?.focus({ preventScroll: true });
    }
  };
  const sources = (sourceIds: string[]) => sourceIds.flatMap((sourceId) => guide?.sources.find((s) => s.id === sourceId) ?? []).map((source) => (
    <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="mr-3 underline underline-offset-2">{source.institution}: {source.title}</a>
  ));

  return <article className="p-5 md:p-7">
    <Link href={href(park.path)} scroll={false} className="inline-flex min-h-11 items-center text-sm font-semibold text-forest">← Voltar à ficha de {park.shortName}</Link>
    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-earth">Fauna e flora</p>
    <h1 className="mt-2 font-display text-3xl font-semibold text-forest-deep md:text-4xl">A vida em {park.shortName}</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-soft">Explore as espécies do levantamento e os destaques editoriais. Fotografias podem ter sido feitas em outros lugares; registros não medem abundância nem chance de avistamento.</p>

    <div className="mt-7 grid items-start gap-6 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)]">
      <section aria-label="Escolher espécie" className="min-w-0 rounded-2xl border border-line bg-card p-3 md:sticky md:top-5">
        <label htmlFor={`${id}-search`} className="text-sm font-semibold text-forest-deep">Encontrar espécie</label>
        <input id={`${id}-search`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome ou família" className="mt-2 min-h-11 w-full rounded-lg border border-line bg-paper px-3 text-sm" />
        <label htmlFor={`${id}-group`} className="mt-3 block text-xs font-semibold text-ink-soft">Explorar grupo</label>
        <select id={`${id}-group`} value={group} onChange={(event) => setGroup(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-paper px-2 text-sm">
          <option value="todas">Todas as espécies</option><option value="animais">Animais</option><option value="plantas">Plantas</option><option value="ameacadas">Ameaçadas na seleção</option>
        </select>
        <p role="status" className="my-3 text-xs text-ink-soft">{results.length} espécies nesta seleção</p>
        <ul className="max-h-[44dvh] space-y-1 overflow-y-auto md:max-h-[62dvh]">
          {results.map((item) => <li key={item.scientificName}>
            <button type="button" aria-pressed={item.scientificName === active?.scientificName} aria-controls={`${id}-detail`} onClick={() => choose(item)} className={`flex min-h-16 w-full items-center gap-3 rounded-xl p-2 text-left ${item.scientificName === active?.scientificName ? "bg-moss/25 ring-1 ring-forest/30" : "hover:bg-paper"}`}>
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-paper-deep">{item.photo && <Image src={item.photo.src} alt="" fill sizes="48px" className="object-contain" />}</span>
              <span className="min-w-0"><span className="block text-sm font-semibold text-forest-deep">{item.name ?? item.scientificName}</span>{item.name && <span className="block text-xs italic text-ink-soft">{item.scientificName}</span>}</span>
            </button>
          </li>)}
          {!results.length && <li className="py-5 text-sm text-ink-soft">Nenhuma espécie nesta seleção. Tente outro nome ou grupo.</li>}
        </ul>
      </section>

      {active && <section ref={detailRef} tabIndex={-1} id={`${id}-detail`} aria-label={`Detalhes de ${active.name ?? active.scientificName}`} className="min-w-0 scroll-mt-5 rounded-2xl border border-line bg-card p-4 md:p-6">
        <button type="button" onClick={() => document.getElementById(`${id}-search`)?.focus()} className="mb-3 min-h-11 text-sm font-semibold text-forest md:hidden">← Escolher outra espécie</button>
        <p className="text-xs font-semibold uppercase tracking-wider text-earth">Conheça a espécie</p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-forest-deep [overflow-wrap:anywhere]">{active.name ?? active.scientificName}</h2>
        <p className="mt-1 text-sm italic text-ink-soft">{active.scientificName}</p>
        <div className="mt-5 overflow-hidden rounded-xl"><SpeciesPhoto photo={active.photo} name={active.name ?? active.scientificName} sizes="(min-width: 768px) 600px, 90vw" /></div>
        {active.photo && <><Credit photo={active.photo} className="mt-2" /><p className="mt-2 text-xs leading-relaxed text-ink-soft">{active.photo.context ?? "Imagem ilustrativa da espécie; o local da fotografia pode ser diferente deste parque."}</p></>}
        <h3 className="mt-6 font-display text-xl font-semibold text-forest-deep">Relação com o parque</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink">{flagship?.why ?? "Esta espécie faz parte do levantamento de ocorrências consultado para a unidade. A inclusão na seleção não significa que ela seja exclusiva do parque ou um símbolo oficial."}</p>
        {flagship && <p className="mt-2 text-xs leading-relaxed text-ink-soft">{sources(flagship.sourceIds)}</p>}
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-paper p-3"><dt className="text-xs text-ink-soft">Família</dt><dd className="mt-1 font-semibold">{active.family ?? "Não informada na base"}</dd></div>
          <div className="rounded-xl bg-paper p-3"><dt className="text-xs text-ink-soft">Registros no levantamento</dt><dd className="mt-1 font-semibold">{active.records ?? "Contagem não informada"}</dd></div>
        </dl>
        <h3 className="mt-6 font-display text-xl font-semibold text-forest-deep">Conservação</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink"><strong>{conservation?.label ?? "Categoria não informada na base"}.</strong> {conservation?.explanation ?? "A ausência de informação não permite concluir que a espécie esteja fora de risco."}</p>
        {evidence && <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-forest underline">{evidence.label}</a>}
        {bio.generatedAt && <p className="mt-2 text-xs text-ink-soft">Levantamento: {bio.generatedAt}. Registros não representam o número de indivíduos.</p>}
        {!!guide?.stories.length && <details className="mt-6 border-t border-line pt-4">
          <summary className="cursor-pointer font-display text-xl font-semibold text-forest-deep">História e conservação do parque</summary>
          <p className="mt-2 text-xs leading-relaxed text-ink-soft">Contexto histórico do parque; estes relatos não constituem uma biografia desta espécie.</p>
          {guide.stories.slice(0, 3).map((story) => <div key={story.title} className="mt-4"><h4 className="font-semibold text-ink">{story.title}</h4><p className="mt-1 text-sm leading-relaxed text-ink">{story.text}</p><p className="mt-2 text-xs text-ink-soft">{sources(story.sourceIds)}</p></div>)}
        </details>}
      </section>}
    </div>
  </article>;
}
