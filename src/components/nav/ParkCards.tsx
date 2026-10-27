"use client";

import Image from "@/components/panel/PhotoImage";
import Link from "next/link";
import { ViewTransition } from "react";
import { useExplore } from "@/components/map/focus";
import type { PlaceSummary } from "@/lib/data/types";
import { BIOME_COLOR, BIOME_LABEL, formatArea, href } from "@/lib/labels";

/**
 * Lista de parques com miniatura. Passar o mouse (ou focar) destaca o parque
 * no mapa; o filtro de biomas vale aqui também, com estado vazio útil.
 */
export function ParkCards({
  items,
  heading,
  /** UF da página, para indicar parques que também estão em outros estados. */
  hereCode,
  morph = true,
  filterable = true,
}: {
  items: PlaceSummary[];
  heading: string;
  hereCode?: string;
  morph?: boolean;
  /** Se a lista obedece ao filtro de biomas (listas de "próximos" não precisam). */
  filterable?: boolean;
}) {
  const { biomes, setHighlight, clearBiomes } = useExplore();
  const visible = filterable && biomes ? items.filter((p) => p.biome && biomes.includes(p.biome)) : items;
  if (!items.length) return null;

  return (
    <section className="px-4 pt-6" aria-label={heading}>
      <div className="flex items-baseline justify-between px-1">
        <h2 className="font-display text-xl font-semibold text-forest-deep">{heading}</h2>
        {filterable && biomes && (
          <p className="text-xs text-ink-soft" aria-live="polite">
            {visible.length} de {items.length}
          </p>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-line px-4 py-5 text-center">
          <p className="text-sm text-ink">
            Nenhum parque deste conjunto corresponde aos biomas selecionados.
          </p>
          <button
            type="button"
            onClick={clearBiomes}
            className="mt-3 h-10 rounded-full bg-forest px-4 text-sm font-medium text-card hover:bg-forest-deep"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <ul className="stagger mt-2 space-y-1" onMouseLeave={() => setHighlight(null)}>
          {visible.map((p, i) => {
            const slug = p.path[2];
            const others = p.ufs?.filter((u) => u !== hereCode) ?? [];
            const thumb = (
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-paper-deep">
                {p.photo ? (
                  <Image src={p.photo.src} alt="" fill sizes="80px" className="object-cover" />
                ) : (
                  // Sem foto confiável: só a cor do bioma (nenhuma imagem inventada).
                  <div
                    className="h-full w-full opacity-25"
                    style={{ background: p.biome && BIOME_COLOR[p.biome] }}
                  />
                )}
              </div>
            );
            return (
              <li key={slug} style={{ "--i": i } as React.CSSProperties}>
                <Link
                  href={href(p.path)}
                  scroll={false}
                  prefetch
                  onMouseEnter={() => setHighlight({ kind: "park", slug })}
                  onFocus={() => setHighlight({ kind: "park", slug })}
                  onBlur={() => setHighlight(null)}
                  className="group flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-card focus-visible:bg-card"
                >
                  {morph ? (
                    <ViewTransition name={`park-photo-${slug}`} share="morph" default="none">
                      {thumb}
                    </ViewTransition>
                  ) : (
                    thumb
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-[17px] leading-tight font-semibold text-forest-deep">
                      {p.name}
                    </span>
                    {p.biome && (
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: BIOME_COLOR[p.biome] }}
                        />
                        {BIOME_LABEL[p.biome]}
                        {p.areaHa ? ` · ${formatArea(p.areaHa, { short: true })}` : ""}
                      </span>
                    )}
                    {hereCode && others.length > 0 && (
                      <span className="mt-0.5 block truncate text-xs text-ink-soft">
                        Também em {others.join(", ")}
                      </span>
                    )}
                  </span>
                  <svg
                    viewBox="0 0 16 16"
                    width="12"
                    height="12"
                    aria-hidden="true"
                    className="mr-1.5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5"
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
            );
          })}
        </ul>
      )}
    </section>
  );
}
