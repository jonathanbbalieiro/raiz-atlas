"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useExplore } from "@/components/map/focus";
import { href, normalize, plural } from "@/lib/labels";

/**
 * Aba "Estados": busca rápida e lista dos estados com parques, seguida dos que
 * não têm parque nacional. As contagens seguem o filtro de biomas do mapa e
 * passar o mouse (ou focar) destaca o estado no mapa.
 */
export function StatesTab() {
  const { index, visibleParks, biomes, setHighlight, clearBiomes } = useExplore();
  const [query, setQuery] = useState("");
  const inputId = useId();
  const q = normalize(query.trim());

  const rows = index.admin1.map((a) => ({
    ...a,
    shown: visibleParks.filter((p) => p.ufs.includes(a.code)).length,
  }));
  const matches = (r: (typeof rows)[number]) => !q || normalize(r.name).includes(q) || normalize(r.code).includes(q);
  const withParks = rows.filter((r) => r.shown > 0 && matches(r)).sort((a, b) => b.shown - a.shown || a.name.localeCompare(b.name, "pt-BR"));
  const without = rows.filter((r) => r.shown === 0 && matches(r));
  const total = rows.filter((r) => r.shown > 0).length;
  const max = Math.max(1, ...rows.map((r) => r.shown));

  const item = (r: (typeof rows)[number]) => (
    <li key={r.slug} className="border-b border-line">
      <Link
        href={href([index.country, r.slug])}
        scroll={false}
        prefetch
        onMouseEnter={() => setHighlight({ kind: "admin1", slug: r.slug })}
        onFocus={() => setHighlight({ kind: "admin1", slug: r.slug })}
        onBlur={() => setHighlight(null)}
        className="group grid min-h-14 grid-cols-[2.25rem_1fr_auto] items-center gap-x-3 px-1 py-2 transition-colors hover:bg-paper-deep/50 focus-visible:bg-paper-deep/50"
      >
        <span className="font-display text-sm font-semibold tracking-wide text-earth">{r.code}</span>
        <span className="min-w-0">
          <span className={`block truncate text-[15px] ${r.shown ? "font-medium text-ink" : "text-ink-soft"}`}>{r.name}</span>
          {r.shown > 0 && (
            <span aria-hidden="true" className="mt-1.5 block h-0.5 overflow-hidden rounded-full bg-paper-deep">
              <span className="block h-full rounded-full bg-forest/70" style={{ width: `${(r.shown / max) * 100}%` }} />
            </span>
          )}
        </span>
        <span className="flex items-center gap-2 text-xs text-ink-soft">
          {r.shown > 0 ? <span className="tabular-nums"><span className="text-sm font-semibold text-forest-deep">{r.shown}</span> {r.shown === 1 ? "parque" : "parques"}</span> : <span>{r.parkCount ? "nenhum no filtro" : "sem parque nacional"}</span>}
          <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="shrink-0 transition-transform group-hover:translate-x-0.5">
            <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
      </Link>
    </li>
  );

  return (
    <section className="px-5 pt-7 pb-4" aria-labelledby="estados-titulo">
      <p className="text-xs font-semibold tracking-[0.14em] text-earth uppercase">Território</p>
      <h2 id="estados-titulo" className="mt-1 font-display text-[28px] leading-tight font-semibold text-forest-deep">Parques por estado</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        {total} {total === 1 ? "unidade da federação tem" : "unidades da federação têm"} parques nacionais{biomes ? " no filtro atual" : ""}. Parques que cruzam divisas contam em cada estado que abrangem.
      </p>
      {biomes && (
        <p className="mt-1 text-xs text-ink-soft">
          Contagens filtradas por bioma.{" "}
          <button type="button" onClick={clearBiomes} className="font-medium text-forest underline underline-offset-2">Limpar filtros</button>
        </p>
      )}
      <label htmlFor={inputId} className="sr-only">Buscar estado</label>
      <input
        id={inputId}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar estado ou sigla"
        autoComplete="off"
        className="mt-4 h-11 w-full rounded-xl border border-line bg-card px-3.5 text-[15px] text-ink placeholder:text-ink-soft focus:border-forest focus:outline-none"
      />
      <p role="status" className="sr-only">{plural(withParks.length + without.length, "estado encontrado", "estados encontrados")}</p>
      <ul className="mt-3 border-t border-line" onMouseLeave={() => setHighlight(null)}>
        {withParks.map(item)}
      </ul>
      {without.length > 0 && (
        <>
          <h3 className="mt-6 text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">Sem parque nacional{biomes ? " no filtro" : ""}</h3>
          <ul className="mt-1 border-t border-line" onMouseLeave={() => setHighlight(null)}>{without.map(item)}</ul>
        </>
      )}
      {!withParks.length && !without.length && <p className="mt-6 text-center text-sm text-ink-soft">Nenhum estado encontrado para “{query}”.</p>}
    </section>
  );
}
