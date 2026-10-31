import type { Biodiversity, ParkGuide, Photo, SpeciesCard } from "./data/types";
import { photoIsPubliclyReusable } from "./photos";
import { mergeSpecies } from "./species-search";
import speciesNames from "../../data/br/species-names.json";

const taxonKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");
type SpeciesDataset = { biodiversity?: Biodiversity; guide?: ParkGuide };

export type PhotoReview = {
  photos: Record<string, Photo>;
  rejected: { scientificName: string; sourceUrl: string; reason: string }[];
};

export function applySpeciesPhotoReview<T extends SpeciesDataset>(park: T, review: PhotoReview): T {
  const clean = <S extends { scientificName: string; photo?: Photo | null }>(species: S): S => {
    const names: Record<string, string> = speciesNames;
    const name = names[species.scientificName];
    if (name) species = { ...species, name };
    const selected = review.photos[species.scientificName];
    const rejected = review.rejected.some((entry) => taxonKey(entry.scientificName) === taxonKey(species.scientificName) && entry.sourceUrl === species.photo?.sourceUrl);
    return selected ? { ...species, photo: selected } : rejected ? { ...species, photo: null } : species;
  };
  return {
    ...park,
    biodiversity: park.biodiversity && { ...park.biodiversity,
      groups: park.biodiversity.groups.map((group) => ({ ...group, species: group.species.map(clean) })),
      threatened: park.biodiversity.threatened.map(clean),
    },
    guide: park.guide && { ...park.guide, flagships: park.guide.flagships.map((species) => {
      const cleaned = clean(species);
      return cleaned.photo === null ? { ...cleaned, photo: undefined } : cleaned;
    }) },
  };
}

export function resolveFlagshipCard(flagship: ParkGuide["flagships"][number], bio?: Biodiversity): SpeciesCard | null {
  const matches = mergeSpecies([...(bio?.groups.flatMap((g) => g.species) ?? []), ...(bio?.threatened ?? [])])
    .filter((species) => taxonKey(species.scientificName) === taxonKey(flagship.scientificName));
  const card = matches.find((species) => species.photo) ?? matches[0];
  if (card) return flagship.photo ? { ...card, photo: flagship.photo } : card;
  return flagship.photo ? {
    gbifKey: 0, scientificName: flagship.scientificName, name: flagship.name,
    family: null, records: null, iucn: flagship.iucn ?? null, wikidata: null, photo: flagship.photo,
  } : null;
}

/** Reúne as entradas do explorador sem transformar destaque editorial em ocorrência. */
export function biodiversityRoster(bio: Biodiversity, guide?: ParkGuide): SpeciesCard[] {
  const roster = mergeSpecies([...bio.groups.flatMap((g) => g.species), ...bio.threatened]);
  for (const [index, flagship] of (guide?.flagships ?? []).entries()) {
    const existing = roster.findIndex((s) => taxonKey(s.scientificName) === taxonKey(flagship.scientificName));
    const card = resolveFlagshipCard(flagship, bio);
    if (existing >= 0) {
      if (card) roster[existing] = { ...roster[existing], photo: card.photo };
      continue;
    }
    roster.push(card ? { ...card, iucn: card.iucn ?? flagship.iucn ?? null, gbifKey: -(index + 1) } : {
      gbifKey: -(index + 1), scientificName: flagship.scientificName, name: flagship.name,
      family: null, records: null, iucn: flagship.iucn ?? null, wikidata: null, photo: null,
    });
  }
  return roster;
}

/** Reuso de identificação já presente na base, nunca inferência por nome popular.
 * Não comprova o local da fotografia nem cria uma ocorrência em outro parque. */
export function buildSpeciesPhotoCatalog(parks: SpeciesDataset[]): Map<string, Photo> {
  const catalog = new Map<string, Photo>();
  for (const park of parks) {
    const candidates = [
      ...(park.biodiversity?.groups.flatMap((g) => g.species) ?? []),
      ...(park.biodiversity?.threatened ?? []),
      ...(park.guide?.flagships ?? []),
    ];
    for (const species of candidates) {
      const photo = species.photo;
      const key = taxonKey(species.scientificName);
      if (!photo || !photoIsPubliclyReusable(photo) || (photo.width ?? 0) <= 0 ||
        !photo.author.trim() || /desconhecid|unknown/i.test(photo.author) ||
        !taxonKey(photo.alt).includes(key)) continue;
      const previous = catalog.get(key);
      // Para identificação importa a dimensão menor, não apenas a largura panorâmica.
      const detail = (p: Photo) => Math.min(p.width ?? 0, p.height ?? 0);
      if (!previous || detail(photo) > detail(previous)) catalog.set(key, photo);
    }
  }
  return catalog;
}

/** Uma imagem por táxon em todos os parques, com prioridade para a curadoria. */
export function fillSpeciesPhotoGaps<T extends SpeciesDataset>(park: T, catalog: Map<string, Photo>): T {
  const find = (scientificName: string) => {
    const photo = catalog.get(taxonKey(scientificName));
    return photo ? { ...photo, context: `Fotografia ilustrativa de ${scientificName}, feita fora deste parque.` } : undefined;
  };
  const fill = <S extends { scientificName: string; photo: Photo | null }>(species: S): S =>
    ({ ...species, photo: find(species.scientificName) ?? species.photo });
  return {
    ...park,
    biodiversity: park.biodiversity && {
      ...park.biodiversity,
      groups: park.biodiversity.groups.map((g) => ({ ...g, species: g.species.map(fill) })),
      threatened: park.biodiversity.threatened.map(fill),
    },
    guide: park.guide && {
      ...park.guide,
      flagships: park.guide.flagships.map((s) => {
        return { ...s, photo: find(s.scientificName) ?? s.photo };
      }),
    },
  };
}
