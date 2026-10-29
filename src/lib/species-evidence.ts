import type { Biodiversity, IucnCategory, SpeciesCard } from "./data/types";
import { mergeSpecies } from "./species-search";

const ANIMAL_GROUPS = new Set(["mamiferos", "aves", "repteis", "anfibios", "peixes", "borboletas"]);

export const THREATENED_CATEGORIES: readonly IucnCategory[] = ["CR", "EN", "VU"];

/** Ameaçada = categoria global CR, EN ou VU. A lista `threatened` do levantamento não define o filtro. */
export const isThreatened = (species: Pick<SpeciesCard, "iucn">) => !!species.iucn && THREATENED_CATEGORIES.includes(species.iucn);

export function biodiversitySelections(bio: Biodiversity) {
  const everyone = mergeSpecies([...bio.groups.flatMap((g) => g.species), ...bio.threatened]);
  const animals = new Set(bio.groups.filter((g) => ANIMAL_GROUPS.has(g.id)).flatMap((g) => g.species.map((s) => s.gbifKey)));
  const plants = new Set(bio.groups.filter((g) => g.id === "plantas").flatMap((g) => g.species.map((s) => s.gbifKey)));
  return {
    animals: everyone.filter((s) => animals.has(s.gbifKey)),
    plants: everyone.filter((s) => plants.has(s.gbifKey)),
  };
}

export function speciesEvidenceLink(bio: Biodiversity, species: SpeciesCard) {
  if (!Number.isSafeInteger(species.gbifKey) || species.gbifKey <= 0) return null;
  for (const source of bio.sources) {
    try {
      const url = new URL(source.url);
      if (url.protocol !== "https:" || !["www.gbif.org", "gbif.org"].includes(url.hostname) ||
        url.pathname !== "/occurrence/search" || !url.searchParams.get("geometry")?.trim()) continue;
      url.searchParams.set("taxon_key", String(species.gbifKey));
      return { url: url.href, label: "Ver ocorrências na área consultada", spatial: true };
    } catch { /* Fonte sem URL válida não comprova um recorte espacial. */ }
  }
  return { url: `https://www.gbif.org/species/${species.gbifKey}`, label: "Ficha taxonômica no GBIF", spatial: false };
}

export const CONSERVATION_INFO: Record<IucnCategory, { label: string; explanation: string }> = {
  CR: { label: "Criticamente em perigo", explanation: "Uma das três categorias globais de ameaça. A classificação global não mede o tamanho da população neste parque." },
  EN: { label: "Em perigo", explanation: "Uma das três categorias globais de ameaça. O risco global não descreve sozinho a situação da espécie nesta unidade." },
  VU: { label: "Vulnerável", explanation: "Uma das três categorias globais de ameaça. A proteção local de habitats pode ser importante mesmo quando a espécie ocorre em outras regiões." },
  NT: { label: "Quase ameaçada", explanation: "Categoria próxima das categorias de ameaça; não equivale a vulnerável." },
  LC: { label: "Pouco preocupante", explanation: "Não integra as três categorias globais de ameaça. Isso não significa ausência de pressões locais." },
  DD: { label: "Dados insuficientes", explanation: "As informações são insuficientes para avaliar o risco. Não significa que a espécie esteja segura." },
  EW: { label: "Extinta na natureza", explanation: "Categoria global histórica: registros na base não comprovam uma população atual na natureza." },
  EX: { label: "Extinta", explanation: "Categoria global de extinção. Um registro histórico não comprova presença atual no parque." },
};
