import { normalize } from "./labels";

/** Todos os termos precisam corresponder; siglas não aceitam fragmentos. */
export function searchMatchScore(fields: string[], query: string): number {
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) return Infinity;
  const normalized = fields.map(normalize);
  let total = 0;
  for (const term of terms) {
    let best = Infinity;
    for (const field of normalized) {
      if (field === term) { best = -1; break; }
      if (field.length <= 2) continue;
      const index = field.indexOf(term);
      if (index < 0) continue;
      best = Math.min(best, index === 0 || field[index - 1] === " " ? index / 100 : 1 + index);
    }
    if (!Number.isFinite(best)) return Infinity;
    total += best;
  }
  return total;
}
