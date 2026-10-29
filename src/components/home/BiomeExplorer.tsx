"use client";

import { useExplore } from "@/components/map/focus";
import { BIOMES, BIOME_COLOR, BIOME_LABEL, formatArea, plural } from "@/lib/labels";

/**
 * "Descubra por bioma": uma linha por bioma com número de parques, área e o
 * maior parque. Clicar liga o mesmo filtro de bioma do mapa (o primeiro clique
 * isola o bioma; os seguintes somam ou removem). Tudo é derivado do índice.
 */
export function BiomeExplorer() {
  const { index, biomes, toggleBiome, clearBiomes } = useExplore();
  const rows = BIOMES.map((b) => {
    const parks = index.parks.filter((p) => p.biome === b);
    const largest = parks.reduce<(typeof parks)[number] | null>((m, p) => (!m || p.areaHa > m.areaHa ? p : m), null);
    return { b, n: parks.length, area: parks.reduce((s, p) => s + p.areaHa, 0), largest };
  }).filter((r) => r.n > 0);
  const max = Math.max(...rows.map((r) => r.n));

  return (
    <section className="px-5 pt-9" aria-labelledby="biomas-titulo">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="biomas-titulo" className="font-display text-2xl font-semibold text-forest-deep">Descubra por bioma</h2>
        {biomes && <button type="button" onClick={clearBiomes} className="min-h-11 text-xs font-medium text-forest underline underline-offset-2">Limpar filtro</button>}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">Escolha um bioma para destacá-lo no mapa. Cada parque entra pelo bioma predominante.</p>
      <ul className="mt-3 border-t border-line" aria-label="Biomas">
        {rows.map(({ b, n, area, largest }) => {
          const selected = !!biomes?.includes(b);
          const dim = !!biomes && !selected;
          return (
            <li key={b} className="border-b border-line">
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => toggleBiome(b)}
                className={`group grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 px-1 py-3 text-left transition-opacity hover:bg-paper-deep/50 focus-visible:bg-paper-deep/50 ${dim ? "opacity-55" : ""}`}
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-3 w-3 rounded-full ring-2 ring-paper" style={{ background: BIOME_COLOR[b] }} />
                  <span className={`font-display text-lg leading-none ${selected ? "font-semibold text-forest-deep" : "font-medium text-ink"}`}>{BIOME_LABEL[b]}</span>
                  {selected && <span className="rounded-full bg-forest px-2 py-0.5 text-[10px] font-semibold tracking-wide text-card uppercase">No mapa</span>}
                </span>
                <span className="text-sm text-ink-soft tabular-nums"><span className="font-semibold text-ink">{n}</span> {n === 1 ? "parque" : "parques"}</span>
                <span aria-hidden="true" className="col-span-2 h-1 overflow-hidden rounded-full bg-paper-deep">
                  <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${(n / max) * 100}%`, background: BIOME_COLOR[b] }} />
                </span>
                <span className="col-span-2 text-xs text-ink-soft">
                  {formatArea(area, { short: true })} protegidos{largest && n > 1 ? ` · maior: ${largest.shortName}` : largest ? ` · ${largest.shortName}` : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">{biomes ? `Filtro ativo: ${plural(biomes.length, "bioma", "biomas")}` : "Todos os biomas visíveis"}</p>
    </section>
  );
}
