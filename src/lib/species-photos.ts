import type { Biodiversity, ParkGuide, Photo, SpeciesCard } from "./data/types";
import { photoIsPubliclyReusable } from "./photos";

const taxonKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");
type SpeciesDataset = { biodiversity?: Biodiversity; guide?: ParkGuide };

export type PhotoReview = {
  photos: Record<string, Photo>;
  rejected: { scientificName: string; sourceUrl: string; reason: string }[];
};

export function applySpeciesPhotoReview<T extends SpeciesDataset>(park: T, review: PhotoReview): T {
  const clean = <S extends { scientificName: string; photo?: Photo | null }>(species: S): S => {
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
  const matches = [...(bio?.threatened ?? []), ...(bio?.groups.flatMap((g) => g.species) ?? [])]
    .filter((species) => taxonKey(species.scientificName) === taxonKey(flagship.scientificName));
  const card = matches.find((species) => species.photo) ?? matches[0];
  if (card) return flagship.photo ? { ...card, photo: flagship.photo } : card;
  return flagship.photo ? {
    gbifKey: 0, scientificName: flagship.scientificName, name: flagship.name,
    family: null, records: null, iucn: null, wikidata: null, photo: flagship.photo,
  } : null;
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
      if (!photo || !photoIsPubliclyReusable(photo) || (photo.width ?? 0) < 960 ||
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

export function fillSpeciesPhotoGaps<T extends SpeciesDataset>(park: T, catalog: Map<string, Photo>): T {
  const find = (scientificName: string) => {
    const photo = catalog.get(taxonKey(scientificName));
    return photo ? { ...photo, context: `Fotografia ilustrativa de ${scientificName}. Pode ter sido feita fora deste parque; a ocorrência é sustentada pelo levantamento ou pela fonte editorial, não pela imagem.` } : undefined;
  };
  const fill = <S extends { scientificName: string; photo: Photo | null }>(species: S): S =>
    species.photo ? species : { ...species, photo: find(species.scientificName) ?? null };
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
        if (s.photo || resolveFlagshipCard(s, park.biodiversity)?.photo) return s;
        return { ...s, photo: find(s.scientificName) };
      }),
    },
  };
}
