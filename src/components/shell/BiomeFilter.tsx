"use client";

import { useState } from "react";
import { useExplore } from "@/components/map/focus";
import { BIOMES, BIOME_COLOR, BIOME_LABEL, plural } from "@/lib/labels";

/**
 * Legenda que filtra. Um único bloco (não botões soltos): título, chips por
 * bioma com contagem e o total visível. Combina com o estado aberto: as
 * contagens consideram só os parques daquele estado. No celular fica recolhida
 * num botão "Biomas" logo abaixo da busca.
 */
export function BiomeFilter() {
  const { index, focus, biomes, toggleBiome, clearBiomes } = useExplore();
  const [expanded, setExpanded] = useState(false);

  // Escopo atual: o estado aberto (se houver) ou o país inteiro.
  const code = focus?.level === "admin1" ? index.admin1.find((a) => a.slug === focus.path[1])?.code : null;
  const scope = code ? index.parks.filter((p) => p.ufs.includes(code)) : index.parks;
  const counts = Object.fromEntries(BIOMES.map((b) => [b, scope.filter((p) => p.biome === b).length]));
  const shown = biomes ? scope.filter((p) => biomes.includes(p.biome)).length : scope.length;
  const available = BIOMES.filter((b) => counts[b] > 0);
  // Dentro de um parque o filtro não muda o que se vê: some para dar espaço.
  if (focus && (focus.level === "park" || focus.level === "attraction")) return null;

  const status = biomes
    ? `Mostrando ${shown} de ${plural(scope.length, "parque", "parques")}`
    : plural(scope.length, "parque", "parques");

  const chips = (
    <ul className="flex flex-wrap gap-1.5" aria-label="Biomas">
      {available.map((b) => {
        const selected = !!biomes?.includes(b);
        const dim = !!biomes && !selected;
        return (
          <li key={b}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => toggleBiome(b)}
              className={[
                "flex h-8 items-center gap-1.5 rounded-full border pr-2.5 pl-2 text-[13px] transition-colors duration-150 pointer-coarse:h-10",
                selected
                  ? "border-forest bg-forest text-card"
                  : "border-line bg-card text-ink hover:border-ink-soft/40 hover:bg-paper-deep",
                dim ? "opacity-60" : "",
              ].join(" ")}
            >
              {selected ? (
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
                  <path
                    d="M3.5 8.5 6.5 11.5 12.5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: BIOME_COLOR[b] }}
                />
              )}
              <span className="font-medium">{BIOME_LABEL[b]}</span>
              <span className={`tabular-nums ${selected ? "text-card/80" : "text-ink-soft"}`}>
                {counts[b]}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <section
      aria-label="Filtrar parques por bioma"
      data-biome-filter
      className={[
        "pointer-events-none absolute z-20",
        // Celular: abaixo da barra superior.
        "top-[calc(var(--sat)+76px)] left-3 max-md:right-16",
        // Desktop/tablet: canto inferior esquerdo, sem invadir controles nem painel.
        "md:top-auto md:bottom-4 md:left-4 md:max-w-[calc(100%-var(--panel-offset)-96px)]",
      ].join(" ")}
    >
      {/* Celular: botão que expande/recolhe os filtros. */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="surface pointer-events-auto flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-ink md:hidden"
      >
        <FilterIcon />
        Biomas
        {biomes && (
          <span className="rounded-full bg-forest px-1.5 text-xs text-card tabular-nums">
            {biomes.length}
          </span>
        )}
        <span className="text-xs font-normal text-ink-soft">{status}</span>
      </button>

      <div
        className={[
          "surface pointer-events-auto mt-2 rounded-2xl p-3 md:mt-0 md:block",
          expanded ? "block" : "hidden",
        ].join(" ")}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Biomas</p>
          <p className="text-xs text-ink-soft" aria-live="polite">
            {status}
            {biomes && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={clearBiomes}
                  className="font-medium text-forest underline underline-offset-2 hover:text-forest-deep"
                >
                  Limpar filtros
                </button>
              </>
            )}
          </p>
        </div>
        {chips}
      </div>
    </section>
  );
}

function FilterIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}
