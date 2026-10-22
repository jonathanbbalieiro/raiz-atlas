import type { Biome } from "@/lib/data/types";
import { BIOMES, BIOME_COLOR, BIOME_LABEL } from "@/lib/labels";

/** Distribuição de parques por bioma predominante: barra segmentada + legenda com números. */
export function BiomeBar({ biomes }: { biomes: Biome[] }) {
  const total = biomes.length;
  const counts = BIOMES.map((b) => ({ b, n: biomes.filter((x) => x === b).length })).filter((x) => x.n > 0);
  if (!total) return null;
  const summary = counts.map(({ b, n }) => `${BIOME_LABEL[b]}: ${n}`).join(", ");
  return (
    <figure className="mt-4">
      <figcaption className="mb-1.5 text-xs font-medium text-ink-soft">Por bioma predominante</figcaption>
      <div
        className="flex h-2 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`Parques por bioma: ${summary}`}
      >
        {counts.map(({ b, n }) => (
          <span key={b} style={{ width: `${(n / total) * 100}%`, background: BIOME_COLOR[b] }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-soft" aria-hidden="true">
        {counts.map(({ b, n }) => (
          <li key={b} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: BIOME_COLOR[b] }} />
            {BIOME_LABEL[b]} <span className="font-medium text-ink tabular-nums">{n}</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
