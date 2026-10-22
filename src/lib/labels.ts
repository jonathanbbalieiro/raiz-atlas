import type { AccessDifficulty, AttractionTag, AttractionType, Biome } from "./data/types";

export const BIOME_LABEL: Record<Biome, string> = {
  amazonia: "Amazônia",
  cerrado: "Cerrado",
  mata_atlantica: "Mata Atlântica",
  caatinga: "Caatinga",
  pantanal: "Pantanal",
  pampa: "Pampa",
  marinho: "Costeiro-marinho",
};

/**
 * Cor de cada bioma, usada no mapa, nos chips e nas barras. Amazônia (verde
 * escuro e frio) e Mata Atlântica (verde-folha claro e quente) diferem em
 * luminosidade e matiz, não só em tom. O nome do bioma sempre acompanha a
 * cor na interface (nunca só cor).
 */
export const BIOME_COLOR: Record<Biome, string> = {
  amazonia: "#1b5e4a",
  mata_atlantica: "#7aa83c",
  cerrado: "#c7902f",
  caatinga: "#b5553a",
  pantanal: "#2e9c9a",
  pampa: "#b3a24a",
  marinho: "#2c6bb0",
};

export const BIOMES = Object.keys(BIOME_LABEL) as Biome[];

export const TYPE_LABEL: Record<AttractionType, string> = {
  cachoeira: "Cachoeira",
  trilha: "Trilha",
  mirante: "Mirante",
  gruta: "Gruta/caverna",
  praia: "Praia",
  canion: "Cânion",
  poco: "Poço",
  formacao_rochosa: "Formação rochosa",
  rio: "Rio",
  lagoa: "Lagoa",
};

export const DIFFICULTY_LABEL: Record<AccessDifficulty, string> = {
  facil: "Fácil",
  moderada: "Moderada",
  dificil: "Difícil",
  muito_dificil: "Muito difícil",
};

export const TAG_LABEL: Record<AttractionTag, string> = {
  banho_permitido: "Banho permitido",
  acessivel: "Acessível",
  familia: "Ideal para família",
  pet_friendly: "Aceita pets",
  camping: "Camping",
  pernoite: "Pernoite",
  pouca_estrutura: "Pouca estrutura",
  ideal_fotografia: "Ótima para fotos",
  comunidade_tradicional: "Território de comunidade tradicional",
};

export const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;

export const href = (path: string[]) => "/" + path.join("/");

/** "a, b e c" */
export const joinPt = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`;

/** 240585 → "240,6 mil hectares"; 3865169 → "3,87 milhões de hectares" */
export function formatArea(ha: number, { short = false } = {}) {
  const unit = short ? "ha" : "hectares";
  if (ha >= 1_000_000) {
    const v = (ha / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    return short ? `${v} mi ha` : `${v} ${ha >= 2_000_000 ? "milhões" : "milhão"} de hectares`;
  }
  if (ha >= 1000) {
    const v = (ha / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return `${v} mil ${unit}`;
  }
  return `${ha.toLocaleString("pt-BR")} ${unit}`;
}

/** Remove acentos e caixa, para busca. */
export const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
