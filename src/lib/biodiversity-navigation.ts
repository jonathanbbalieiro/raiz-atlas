type Taxon = { scientificName: string };

const taxonKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

/** A ordem editorial orienta a descoberta; os demais mantêm a ordem do levantamento.
 * A presença de foto, o número de registros e o nome popular não alteram essa ordem. */
export function orderBiodiversityRoster<T extends Taxon>(
  roster: readonly T[],
  editorial: readonly Taxon[] = [],
): T[] {
  const priorities = new Map<string, number>();
  for (const [index, entry] of editorial.entries()) {
    const key = taxonKey(entry.scientificName);
    if (!priorities.has(key)) priorities.set(key, index);
  }
  return roster
    .map((entry, index) => ({ entry, index, priority: priorities.get(taxonKey(entry.scientificName)) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .map(({ entry }) => entry);
}

export interface BiodiversityNavigation<T> {
  active: T | undefined;
  previous: T | undefined;
  next: T | undefined;
  /** Índice começa em zero; -1 indica que o resultado está vazio. */
  index: number;
  total: number;
}

/** Resolve os controles no resultado atual, sem substituir a escolha persistida.
 * Ao limpar um filtro temporário, o mesmo preferredName reencontra a espécie.
 * Os limites não dão a volta: anterior/próximo ficam indisponíveis nas pontas. */
export function biodiversityNavigation<T extends Taxon>(
  results: readonly T[],
  preferredName?: string | null,
): BiodiversityNavigation<T> {
  const preferredKey = preferredName ? taxonKey(preferredName) : null;
  const matched = preferredKey ? results.findIndex((entry) => taxonKey(entry.scientificName) === preferredKey) : -1;
  const index = results.length ? Math.max(0, matched) : -1;
  return {
    active: index >= 0 ? results[index] : undefined,
    previous: index > 0 ? results[index - 1] : undefined,
    next: index >= 0 && index + 1 < results.length ? results[index + 1] : undefined,
    index,
    total: results.length,
  };
}
