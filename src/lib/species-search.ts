import type { SpeciesCard } from "./data/types";
import { searchMatchScore } from "./search";

/** A lista de ameaça complementa a ocorrência sem apagar sua foto ou contagem. */
export function mergeSpecies(entries: SpeciesCard[]): SpeciesCard[] {
  const species = new Map<number, SpeciesCard>();
  for (const entry of entries) {
    const previous = species.get(entry.gbifKey);
    species.set(entry.gbifKey, previous ? {
      ...previous, ...entry,
      photo: entry.photo ?? previous.photo,
      records: entry.records ?? previous.records,
      name: entry.name ?? previous.name,
      family: entry.family ?? previous.family,
      iucn: entry.iucn ?? previous.iucn,
    } : entry);
  }
  return [...species.values()];
}

export function filterSpecies(species: SpeciesCard[], query: string, photosOnly = false) {
  return species.filter((entry) => (!photosOnly || Boolean(entry.photo)) &&
    (!query.trim() || Number.isFinite(searchMatchScore([entry.name ?? "", entry.scientificName, entry.family ?? ""], query))));
}
