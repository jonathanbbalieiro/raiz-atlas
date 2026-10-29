"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { Park, SpeciesCard } from "@/lib/data/types";
import { href } from "@/lib/labels";
import { filterSpecies } from "@/lib/species-search";
import { biodiversitySelections, CONSERVATION_INFO, isThreatened, speciesEvidenceLink } from "@/lib/species-evidence";
import { biodiversityRoster } from "@/lib/species-photos";
import { biodiversityNavigation, orderBiodiversityRoster } from "@/lib/biodiversity-navigation";
import Image from "@/components/panel/PhotoImage";
import { SpeciesPhoto } from "@/components/panel/SpeciesPhoto";
import { IUCN_TONE, IucnBadge } from "./SpeciesExplorer";
import { Credit } from "@/components/panel/Gallery";
import { useExplore } from "@/components/map/focus";
import { OCCURRENCE_COLOR } from "@/components/map/theme";
import { cellKm, loadOccurrences, type OccurrenceGrid } from "@/lib/occurrences";
import { loadSpeciesIndex, loadSpeciesProfiles, type SpeciesIndex, type SpeciesProfile } from "@/lib/species-extra";

export function BiodiversityView({ park }: { park: Park }) {
  const bio = park.biodiversity!;
  const guide = park.guide;
  const species = orderBiodiversityRoster(biodiversityRoster(bio, guide), guide?.flagships);
  const editorialNames = new Set(guide?.flagships.map((f) => f.scientificName.toLowerCase()) ?? []);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [group, setGroup] = useState(editorialNames.size ? "destaques" : "todas");
  const [selected, setSelected] = useState<string>();
  const [reading, setReading] = useState(false);
  const [tagOpenFor, setTagOpenFor] = useState("");
  // A espécie aberta precisa estar na seleção atual; senão a leitura cai no primeiro item da lista.
  const showInSelection = (name: string) => {
    setQuery("");
    setGroup(editorialNames.has(name.trim().toLowerCase()) ? "destaques" : "todas");
  };
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selectionScroll = useRef(0);
  const selectionKey = useRef<number | undefined>(undefined);
  const id = useId();
  const explorerPath = `${href(park.path)}/biodiversidade`;
  const selections = biodiversitySelections(bio);
  const selectKeys = (entries: SpeciesCard[]) => {
    const keys = new Set(entries.map((s) => s.gbifKey));
    return species.filter((s) => keys.has(s.gbifKey));
  };
  const groups = [
    { id: "destaques", label: "Destaques", entries: species.filter((s) => editorialNames.has(s.scientificName.toLowerCase())) },
    { id: "todas", label: "Todas", entries: species },
    { id: "animais", label: "Animais", entries: selectKeys(selections.animals) },
    { id: "plantas", label: "Plantas", entries: selectKeys(selections.plants) },
    { id: "ameacadas", label: "Ameaçadas", entries: species.filter(isThreatened) },
  ].filter((item) => item.entries.length);
  const results = filterSpecies(groups.find((item) => item.id === group)?.entries ?? species, query);
  const navigation = biodiversityNavigation(results, selected);
  const active = navigation.active;
  const flagship = guide?.flagships.find((f) => f.scientificName.toLowerCase() === active?.scientificName.toLowerCase());
  const conservation = active?.iucn ? CONSERVATION_INFO[active.iucn] : null;
  const evidence = active ? speciesEvidenceLink(bio, active) : null;
  const surveyDate = bio.generatedAt.split("-").reverse().join("/");
  const { setSpeciesLayer, requestMapView } = useExplore();
  const [country, , parkSlug] = park.path;
  const [grid, setGrid] = useState<OccurrenceGrid | null>(null);
  useEffect(() => {
    let current = true;
    loadOccurrences(country, parkSlug).then((g) => current && setGrid(g));
    return () => {
      current = false;
    };
  }, [country, parkSlug]);
  const [index, setIndex] = useState<SpeciesIndex | null>(null);
  const [profiles, setProfiles] = useState<Record<string, SpeciesProfile> | null>(null);
  useEffect(() => {
    if (!reading) return;
    let current = true;
    loadSpeciesIndex(country).then((i) => current && setIndex(i));
    loadSpeciesProfiles(country).then((p) => current && setProfiles(p));
    return () => {
      current = false;
    };
  }, [reading, country]);
  const activeKey = active?.scientificName.trim().toLowerCase() ?? "";
  const profile = profiles?.[activeKey];
  const otherParks = (index?.species[activeKey] ?? []).filter((slug) => slug !== parkSlug && index?.parks[slug]);
  const groupLabel = active ? bio.groups.find((g) => g.species.some((s) => s.gbifKey === active.gbifKey))?.label : undefined;
  const occurrence = reading && active ? grid?.species[String(active.gbifKey)] : undefined;
  // O mapa mostra onde a espécie em leitura foi registrada; na grade, nada.
  const layerKey = occurrence && active ? active.gbifKey : null;
  useEffect(() => {
    setSpeciesLayer(layerKey ? { park: parkSlug, gbifKey: layerKey } : null);
  }, [layerKey, parkSlug, setSpeciesLayer]);
  useEffect(() => () => setSpeciesLayer(null), [setSpeciesLayer]);
  const panel = () => rootRef.current?.closest<HTMLElement>(".panel");
  const cardId = (item: SpeciesCard) => `${id}-species-${item.gbifKey}`;
  const restoreSelection = useCallback(() => {
    setReading(false);
    requestAnimationFrame(() => {
      rootRef.current?.closest<HTMLElement>(".panel")?.scrollTo({ top: selectionScroll.current, behavior: "instant" });
      document.getElementById(`${id}-species-${selectionKey.current}`)?.focus({ preventScroll: true });
    });
  }, [id]);

  useEffect(() => {
    // Ao recarregar a URL sem uma rota de espécie, a entrada volta à seleção.
    if (window.history.state?.raizSpecies?.path === explorerPath) {
      const state = { ...window.history.state };
      delete state.raizSpecies;
      window.history.replaceState(state, "", window.location.href);
    }
    const onPop = (event: PopStateEvent) => {
      if (window.location.pathname !== explorerPath) return;
      const entry = event.state?.raizSpecies;
      if (entry?.path === explorerPath && typeof entry.name === "string") {
        showInSelection(entry.name);
        setSelected(entry.name);
        setReading(true);
        requestAnimationFrame(() => {
          rootRef.current?.closest<HTMLElement>(".panel")?.scrollTo({ top: 0, behavior: "instant" });
          titleRef.current?.focus({ preventScroll: true });
        });
      } else restoreSelection();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorerPath, restoreSelection]);

  useLayoutEffect(() => {
    // Link direto (#especie=nome científico): abre o perfil sem passar pela grade.
    const openFromHash = () => {
      const match = window.location.hash.match(/^#especie=(.+)$/);
      if (!match) return;
      let name: string;
      try {
        name = decodeURIComponent(match[1]).trim().toLowerCase();
      } catch {
        return;
      }
      const found = species.find((s) => s.scientificName.trim().toLowerCase() === name);
      if (!found) return;
      showInSelection(found.scientificName);
      setSelected(found.scientificName);
      setReading(true);
      requestAnimationFrame(() => {
        rootRef.current?.closest<HTMLElement>(".panel")?.scrollTo({ top: 0, behavior: "instant" });
        titleRef.current?.focus({ preventScroll: true });
      });
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [explorerPath]);

  const choose = (item: SpeciesCard) => {
    if (!reading) {
      selectionScroll.current = panel()?.scrollTop ?? 0;
      selectionKey.current = item.gbifKey;
    }
    const state = { ...window.history.state, raizSpecies: { path: explorerPath, name: item.scientificName } };
    if (reading) window.history.replaceState(state, "", window.location.href);
    else window.history.pushState(state, "", window.location.href);
    setSelected(item.scientificName);
    setReading(true);
    requestAnimationFrame(() => {
      panel()?.scrollTo({ top: 0, behavior: "instant" });
      titleRef.current?.focus({ preventScroll: true });
    });
  };
  const returnToSelection = () => {
    if (window.history.state?.raizSpecies?.path === explorerPath) window.history.back();
    else restoreSelection();
  };
  const sourceLinks = (sourceIds: string[]) => sourceIds.flatMap((sourceId) => guide?.sources.find((source) => source.id === sourceId) ?? []).map((source) => (
    <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="mr-3 underline underline-offset-2">{source.institution}: {source.title}</a>
  ));

  return <article ref={rootRef} className="p-5 md:p-7">
    {!reading ? <>
      <Link href={href(park.path)} scroll={false} className="inline-flex min-h-11 items-center text-sm font-semibold text-forest">← Voltar ao parque</Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-earth">Fauna e flora</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-forest-deep md:text-4xl">{park.shortName}</h1>
      <p className="mt-2 text-sm text-ink-soft">Escolha uma espécie para conhecer sua relação com o parque.</p>
      <div className="mt-5 flex flex-wrap items-center gap-2" role="group" aria-label="Categorias de espécies">
        {groups.map((item) => <button key={item.id} type="button" aria-pressed={group === item.id}
          onClick={() => setGroup(item.id)} className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${group === item.id ? "border-forest bg-forest text-card" : "border-line bg-card text-ink hover:border-forest/40"}`}>{item.label}</button>)}
        <button type="button" aria-expanded={searchOpen} aria-controls={`${id}-search`} onClick={() => { const open = !searchOpen; setSearchOpen(open); setQuery(""); if (open) requestAnimationFrame(() => searchRef.current?.focus()); }} className="ml-auto min-h-11 rounded-full px-3 text-sm font-semibold text-forest underline underline-offset-2">{searchOpen ? "Fechar busca" : "Buscar"}</button>
      </div>
      {searchOpen && <label className="mt-3 block text-sm text-ink-soft" htmlFor={`${id}-search`}>Buscar nesta seleção
        <input ref={searchRef} id={`${id}-search`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nome popular, científico ou família" className="mt-1 min-h-11 w-full rounded-xl border border-line bg-card px-3 text-sm text-ink" />
      </label>}
      <p role="status" className="mt-4 text-xs text-ink-soft">{results.length} {results.length === 1 ? "espécie nesta seleção" : "espécies nesta seleção"}</p>
      <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        {results.map((item) => <li key={item.scientificName}>
          <button type="button" id={cardId(item)} onClick={() => choose(item)} aria-label={`Conhecer ${item.name ?? item.scientificName}`} className="h-full w-full overflow-hidden rounded-2xl border border-line bg-card text-left transition hover:border-forest hover:shadow-sm">
            <span className="relative block aspect-[4/3] bg-paper-deep">{item.photo ? <Image src={item.photo.src} alt="" fill sizes="(min-width: 1024px) 340px, 45vw" className="object-contain p-1" /> : <span className="absolute inset-0 flex items-center justify-center px-3 text-center text-xs text-ink-soft">Foto em curadoria</span>}<IucnBadge iucn={item.iucn} /></span>
            <span className="block p-3 md:p-4"><span className="block font-display text-lg font-semibold leading-tight text-forest-deep">{item.name ?? item.scientificName}</span>{item.name && <span className="mt-1 block text-xs italic text-ink-soft">{item.scientificName}</span>}
              <span className="mt-3 block text-xs font-semibold text-forest">Conhecer a espécie →</span>
            </span>
          </button>
        </li>)}
      </ul>
      {!results.length && <div className="mt-3 rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-soft"><p>Nenhuma espécie encontrada nesta seleção.</p><button type="button" onClick={() => { setQuery(""); setGroup("todas"); }} className="mt-3 min-h-11 font-semibold text-forest underline">Ver todas as espécies</button></div>}
      <details className="mt-7 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
        <summary className="cursor-pointer py-2 font-semibold text-forest-deep">Sobre esta seleção e suas fontes</summary>
        <p className="mt-2">Os destaques são escolhas editoriais documentadas; as demais espécies vêm do levantamento de ocorrências. A lista não é um inventário completo, e registros não medem abundância. Fotos podem ter sido feitas fora do parque.</p>
        <p className="mt-2">Área consultada: {bio.boundary}. {bio.method}</p>
        <ul className="mt-2 space-y-2">{bio.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">{source.title}</a></li>)}</ul>
      </details>
      {!!guide?.stories.length && <details className="mt-3 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
        <summary className="cursor-pointer py-2 font-semibold text-forest-deep">História e conservação de {park.shortName}</summary>
        {guide.stories.slice(0, 3).map((story) => <section key={story.title} className="mt-4"><h2 className="font-semibold text-ink">{story.title}</h2><p className="mt-1">{story.text}</p><p className="mt-2 text-xs">{sourceLinks(story.sourceIds)}</p></section>)}
      </details>}
    </> : active && <>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={returnToSelection} className="min-h-11 text-sm font-semibold text-forest">← Voltar às espécies</button>
        <div className="flex items-center gap-2">
          <p className="text-xs text-ink-soft">{navigation.index + 1} de {navigation.total}</p>
          <Link href={href(park.path)} scroll={false} aria-label={`Fechar e voltar ao parque ${park.shortName}`} className="flex size-11 items-center justify-center rounded-full border border-line bg-card text-lg leading-none text-ink hover:border-forest"><span aria-hidden="true">×</span></Link>
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-earth">{park.shortName} · Fauna e flora</p>
      <h1 ref={titleRef} tabIndex={-1} className="mt-2 font-display text-3xl font-semibold text-forest-deep [overflow-wrap:anywhere] md:text-4xl">{active.name ?? active.scientificName}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-sm italic text-ink-soft">{active.scientificName}</p>
        <button type="button" aria-expanded={tagOpenFor === activeKey} aria-controls={`${id}-conservation`} onClick={() => setTagOpenFor(tagOpenFor === activeKey ? "" : activeKey)}
          className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold ${(active.iucn && IUCN_TONE[active.iucn]) || "border border-line bg-card text-ink"}`}>
          {conservation ? conservation.label : "Sem avaliação IUCN"}<span aria-hidden="true" className="opacity-70">· IUCN {tagOpenFor === activeKey ? "−" : "+"}</span>
        </button>
      </div>
      {tagOpenFor === activeKey && <div id={`${id}-conservation`} className="mt-3 rounded-xl border border-line bg-card px-4 py-3 text-xs leading-relaxed text-ink-soft">
        <p>{conservation?.explanation ?? "A ausência de uma categoria na base não permite concluir que a espécie esteja fora de risco."}</p>
        <p className="mt-1">Categoria global da Lista Vermelha da IUCN, conforme a base consultada em {surveyDate}. Listas nacionais ou estaduais podem atribuir outra categoria.</p>
      </div>}
      <div className="mt-5 grid items-start gap-5 md:grid-cols-2 md:gap-7">
        <figure className="min-w-0">
          <div className="overflow-hidden rounded-2xl"><SpeciesPhoto frame="detail" photo={active.photo} name={active.name ?? active.scientificName} sizes="(min-width: 768px) 500px, 90vw" /></div>
          {active.photo && <figcaption className="mt-2"><Credit photo={active.photo} /><details className="mt-2 text-xs leading-relaxed text-ink-soft"><summary className="cursor-pointer py-1">Contexto da fotografia</summary><p className="mt-1">{active.photo.context ?? "Imagem ilustrativa da espécie; o local pode ser diferente deste parque."}</p></details></figcaption>}
        </figure>
        <div className="min-w-0 space-y-4">
          <section aria-label="Quem é">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-earth">Quem é</h2>
            <p className="mt-2 text-base leading-relaxed text-ink">
              {profile?.summary ?? `${active.name ?? active.scientificName}${groupLabel ? ` faz parte do grupo ${groupLabel.toLowerCase()}` : " integra o levantamento"}${active.family ? `, na família ${active.family}` : ""}. Nome científico: ${active.scientificName}.`}
            </p>
          </section>
          <section aria-label="Relação da espécie com o parque" className="rounded-xl border border-line bg-card px-4 py-3">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-earth">Neste parque</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink">{flagship?.why ?? (typeof active.records === "number" && active.records > 0
              ? `Tem ${active.records} ${active.records === 1 ? "registro" : "registros"} de ocorrência no GBIF na área consultada para ${park.shortName} (levantamento de ${surveyDate}). Estar na lista não significa exclusividade nem facilidade de avistamento.`
              : "A espécie integra a seleção de ocorrências consultada para esta unidade. Sua presença na lista não significa exclusividade ou facilidade de avistamento.")}</p>
            {flagship && <p className="mt-2 text-xs leading-relaxed text-ink-soft">{sourceLinks(flagship.sourceIds)}</p>}
            {occurrence && occurrence.records > 0 && <div className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-soft">
              <p className="flex items-start gap-2">
                <span aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 rounded-sm" style={{ background: OCCURRENCE_COLOR }} />
                <span>No mapa: {occurrence.records} {occurrence.records === 1 ? "registro" : "registros"} em {occurrence.cells.length} {occurrence.cells.length === 1 ? "quadrado" : "quadrados"} de cerca de {cellKm(occurrence.cell)} km. Quanto mais forte a cor, mais registros. Registros mostram onde houve observação ou coleta, não onde a espécie é mais comum.{occurrence.cell >= 0.1 && " Espécie ameaçada: os quadrados são maiores para não indicar onde encontrá-la."}</span>
              </p>
              <button type="button" onClick={requestMapView} className="mt-1 min-h-11 font-semibold text-forest underline underline-offset-2 md:hidden">Ver no mapa</button>
            </div>}
          </section>
        </div>
      </div>
      {profile && <section aria-label="Conhecer a espécie" className="mt-6 grid gap-4 md:grid-cols-2">
        {profile.habits && <div className="min-w-0 rounded-2xl bg-paper-deep/60 p-4 md:p-5"><h2 className="font-display text-lg font-semibold text-forest-deep">Hábitos e lugar na natureza</h2><p className="mt-2 text-sm leading-relaxed text-ink">{profile.habits}</p></div>}
        {profile.history && <div className="min-w-0 rounded-2xl bg-paper-deep/60 p-4 md:p-5"><h2 className="font-display text-lg font-semibold text-forest-deep">História</h2><p className="mt-2 text-sm leading-relaxed text-ink">{profile.history}</p></div>}
        {!!profile.curiosities?.length && <div className="min-w-0 md:col-span-2"><h2 className="font-display text-lg font-semibold text-forest-deep">Curiosidades</h2>
          <ul className="mt-2 grid gap-3 md:grid-cols-3">{profile.curiosities.map((item, i) => <li key={item} className="rounded-2xl border border-line bg-card p-4 text-sm leading-relaxed text-ink"><span className="mb-1 block font-display text-lg text-earth" aria-hidden="true">{i + 1}</span>{item}</li>)}</ul></div>}
        <p className="min-w-0 text-xs leading-relaxed text-ink-soft md:col-span-2">Fontes: {profile.sources.map((source, i) => <span key={source.url}>{i > 0 && " · "}<a href={source.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{source.institution}: {source.title}</a></span>)}</p>
      </section>}
      {otherParks.length > 0 && <section aria-label="Também registrada em" className="mt-6">
        <h2 className="font-display text-lg font-semibold text-forest-deep">Também registrada em</h2>
        <ul className="mt-2 flex flex-wrap gap-2">{otherParks.map((slug) => <li key={slug}>
          <Link href={`${href([country, index!.parks[slug].uf, slug])}/biodiversidade#especie=${encodeURIComponent(active.scientificName)}`} scroll={false} className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm font-semibold text-forest hover:border-forest">{index!.parks[slug].name}</Link>
        </li>)}</ul>
        <p className="mt-2 text-xs text-ink-soft">Parques do atlas em cujo levantamento a espécie também consta.</p>
      </section>}
      <details className="mt-6 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
        <summary className="cursor-pointer py-2 font-semibold text-forest-deep">Dados do levantamento e fontes</summary>
        <dl className="mt-3 grid gap-3 sm:grid-cols-3"><div><dt>Família</dt><dd className="font-semibold text-ink">{active.family ?? "Não informada"}</dd></div><div><dt>Registros</dt><dd className="font-semibold text-ink">{active.records ?? "Contagem não informada"}</dd></div><div><dt>Levantamento</dt><dd className="font-semibold text-ink">{surveyDate}</dd></div></dl>
        <p className="mt-3">Registros não representam o número de indivíduos. A categoria de conservação é global, não uma avaliação da população local.</p>
        {evidence && <a href={evidence.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-semibold text-forest underline">{evidence.label}</a>}
        {active.iucn && <a href="https://www.iucnredlist.org/resources/categories-and-criteria" target="_blank" rel="noopener noreferrer" className="mt-3 ml-4 inline-block text-forest underline">Categorias da IUCN</a>}
      </details>
      <nav aria-label="Navegar entre espécies" className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
        <button type="button" disabled={!navigation.previous} onClick={() => navigation.previous && choose(navigation.previous)} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-forest disabled:opacity-40">← Espécie anterior</button>
        <button type="button" disabled={!navigation.next} onClick={() => navigation.next && choose(navigation.next)} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold text-forest disabled:opacity-40">Próxima espécie →</button>
      </nav>
    </>}
  </article>;
}
