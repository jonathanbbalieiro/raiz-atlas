"use client";

import Link from "next/link";
import { useExplore } from "@/components/map/focus";
import { href, plural } from "@/lib/labels";

/**
 * Lista navegável dos estados (alternativa ao mapa). As contagens vêm do
 * índice e seguem o filtro de biomas. Parques que cruzam divisas contam em
 * cada estado que abrangem.
 */
export function StateList() {
  const { index, visibleParks, biomes, setHighlight, clearBiomes } = useExplore();
  const rows = index.admin1.map((a) => ({
    ...a,
    shown: visibleParks.filter((p) => p.ufs.includes(a.code)).length,
  }));
  const withParks = rows.filter((r) => r.shown > 0).length;

  return (
    <section className="px-4 pt-6" aria-labelledby="estados-titulo">
      <div className="flex items-baseline justify-between px-1">
        <h2 id="estados-titulo" className="font-display text-xl font-semibold text-forest-deep">
          Estados
        </h2>
        <p className="text-xs text-ink-soft">
          {biomes ? `${withParks} com parques no filtro` : `${withParks} com parques`}
        </p>
      </div>
      {biomes && (
        <p className="mt-1 px-1 text-xs text-ink-soft">
          Contagens filtradas por bioma.{" "}
          <button
            type="button"
            onClick={clearBiomes}
            className="font-medium text-forest underline underline-offset-2"
          >
            Limpar filtros
          </button>
        </p>
      )}
      <ul
        className="stagger mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line bg-card"
        onMouseLeave={() => setHighlight(null)}
      >
        {rows.map((r, i) => (
          <li key={r.slug} style={{ "--i": i } as React.CSSProperties}>
            <Link
              href={href([index.country, r.slug])}
              scroll={false}
              prefetch
              onMouseEnter={() => setHighlight({ kind: "admin1", slug: r.slug })}
              onFocus={() => setHighlight({ kind: "admin1", slug: r.slug })}
              onBlur={() => setHighlight(null)}
              className="group flex min-h-12 items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-paper focus-visible:bg-paper"
            >
              <span
                className={`min-w-0 flex-1 truncate ${r.shown ? "font-medium text-ink" : "text-ink-soft"}`}
              >
                {r.name}
              </span>
              {r.shown > 0 ? (
                <span className="shrink-0 rounded-full bg-paper-deep px-2 py-0.5 text-xs font-medium text-forest-deep tabular-nums">
                  {plural(r.shown, "parque", "parques")}
                </span>
              ) : (
                <span className="shrink-0 text-xs text-ink-soft">
                  {r.parkCount ? "nenhum no filtro" : "sem parque nacional"}
                </span>
              )}
              <svg
                viewBox="0 0 16 16"
                width="12"
                height="12"
                aria-hidden="true"
                className="shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5"
              >
                <path
                  d="M6 3l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 px-1 text-[11px] text-ink-soft">
        Parques que cruzam divisas aparecem em cada estado que abrangem.
      </p>
    </section>
  );
}
