/**
 * Modelo de dados hierárquico e genérico.
 *
 *   country (país) > admin1 (estado/província) > park (parque nacional) > attraction
 *
 * Nada aqui é específico do Brasil: adicionar outro país é adicionar arquivos
 * em `data/<país>/` e um provedor em `scripts/build-geo.mjs`.
 */

/** Marcador para qualquer fato que ainda não foi confirmado em fonte confiável. */
export const TO_VERIFY = "A_VERIFICAR" as const;
export type ToVerify = typeof TO_VERIFY;

/** Um valor factual ou o marcador "A_VERIFICAR". */
export type Verifiable<T> = T | ToVerify;

export const isVerified = <T>(v: Verifiable<T>): v is T => v !== TO_VERIFY;

/** [oeste, sul, leste, norte] em graus (WGS84). */
export type BBox = [number, number, number, number];
/** [longitude, latitude] (ordem GeoJSON). */
export type LngLat = [number, number];

export type PlaceLevel = "country" | "admin1" | "park" | "attraction";

export type Biome = "amazonia" | "cerrado" | "mata_atlantica" | "caatinga" | "pantanal" | "pampa" | "marinho";

/** Campos comuns a todos os nós da hierarquia. */
export interface PlaceBase {
  level: PlaceLevel;
  /** Segmentos de URL a partir do país, ex.: ["br", "go", "chapada-dos-veadeiros"]. */
  path: string[];
  slug: string;
  name: string;
  /** Gerado pelo pipeline de geodados; usado no enquadramento do mapa. */
  bbox: BBox;
}

export interface Country extends PlaceBase {
  level: "country";
  /** ISO 3166-1 alpha-2 em minúsculas. */
  iso2: string;
  admin1Label: { singular: string; plural: string };
  description: string;
}

export interface Admin1 extends PlaceBase {
  level: "admin1";
  /** Código curto (UF). */
  code: string;
  /** Código oficial do órgão de estatística (IBGE no Brasil). */
  officialCode: number;
  /** Preposição usada antes do nome em textos ("no" Paraná, "na" Bahia, "em" Goiás). */
  prep?: string;
  /** Ponto onde o indicador do estado é desenhado. */
  labelPoint: LngLat;
}

export interface Photo {
  src: string;
  alt: string;
  author: string;
  /** Nome curto da licença, ex.: "CC BY-SA 4.0". */
  license: string;
  licenseUrl: string;
  /** Página de origem (exigência de atribuição das licenças CC). */
  sourceUrl: string;
  /** Contexto editorial da imagem: local, espécie ou limite de procedência. */
  context?: string;
  width?: number;
  height?: number;
}

/** Fonte consultada para um ou mais campos. */
export interface Source {
  title: string;
  url: string;
  /** Data de acesso (AAAA-MM-DD). */
  accessed: string;
  fields: string[];
}

export interface Park extends PlaceBase {
  level: "park";
  /** Código no Cadastro Nacional de Unidades de Conservação. */
  cnuc: string;
  /** Nome sem "Parque Nacional", para mapa e listas. */
  shortName: string;
  /** Siglas de todas as UFs que o parque abrange. */
  ufs: string[];
  /** Estado da URL canônica (onde fica o interior do parque). */
  admin1: string;
  biome: Biome;
  biomes: Biome[];
  areaHa: number;
  createdYear: number | null;
  creationAct: string | null;
  labelPoint: LngLat;
  /** Até 300 caracteres. */
  shortDescription: string;
  /** Texto editorial opcional (parágrafos separados por linha em branco). */
  longDescription?: string;
  photos: Photo[];
  wikipediaUrl: string | null;
  sources: Source[];
  /** Dossiê de pesquisa com uma fonte por afirmação (opcional). */
  research?: ParkResearch;
  /** Resumo da Expedição, só quando ela pode ser lida neste ambiente. */
  expedition?: ExpeditionSummary;
  /** Guia editorial: encanto, o que protege, maravilhas, curiosidades, histórias. */
  guide?: ParkGuide;
  /** Espécies registradas dentro do limite do parque (pipeline `npm run bio`). */
  biodiversity?: Biodiversity;
  /** Espécies extintas, extintas localmente e megafauna fóssil ligadas ao parque (opcional). */
  lostWorld?: LostWorld;
  /** Unidades de conservação, terras indígenas e quilombos no entorno (opcional). */
  context?: ParkContext;
}

/* ---------- Mundo perdido (data/<país>/parks/<parque>/lost-world.json) ---------- */

export type LostKind =
  | "extinta"
  | "extinta_na_natureza"
  | "possivelmente_extinta"
  | "extinta_localmente"
  | "megafauna_fossil"
  | "reintroduzida"
  | "recolonizada";

export interface LostSpecies {
  kind: LostKind;
  name: string;
  scientificName: string;
  /** Quando: "extinta no século XX", "há cerca de 10 mil anos"… */
  when: string;
  /** 2 a 4 frases: o que era, o que aconteceu, o que resta. */
  text: string;
  sourceIds: string[];
  photo: ContextPhoto | null;
}

export interface LostWorld {
  schemaVersion: 1;
  status: "rascunho" | "revisado";
  updatedAt: string;
  /** Uma frase que abre a seção. */
  intro: string;
  items: LostSpecies[];
  sources: GuideSource[];
}

/* ---------- Guia editorial do parque (data/<país>/parks/<parque>/guide.json) ---------- */

/** Fonte do guia; cada afirmação aponta para uma ou mais pelo `id`. */
export interface GuideSource {
  id: string;
  institution: string;
  title: string;
  url: string;
  accessed: string;
}

export interface GuideItem {
  title: string;
  text: string;
  sourceIds: string[];
}

/**
 * Lugar de uma maravilha ou de um momento da Expedição. "aproximado" quando o
 * ponto representa uma área (cânion, trecho de rio) ou um lugar sem marco exato.
 */
export interface MapLocation {
  coordinates: LngLat;
  precision: "ponto" | "aproximado";
  /** Ids das fontes do guia (ou da Expedição) que sustentam o lugar. */
  sourceIds: string[];
  /** Elemento do OpenStreetMap usado como referência, ex.: "node/2590164100". */
  osm?: string;
}

/** Áreas protegidas e territórios no entorno (scripts/build-park-context.mjs). */
export interface ParkContext {
  generatedAt: string;
  marginDegrees: number;
  sources: { id: string; title: string; url: string }[];
  areas: {
    id: string;
    kind: "protecao-integral" | "uso-sustentavel" | "rppn" | "terra-indigena" | "quilombola";
    name: string;
    category: string;
    detail: string;
    areaHa: number | null;
    source: string;
  }[];
}

export type FlagshipCriterion = "endemica" | "ameacada_com_acao" | "habitat_critico" | "papel_ecologico" | "icone_da_paisagem" | "cultural";

export interface ParkGuide {
  schemaVersion: 1;
  /** "rascunho" aparece só em prévia; "revisado" é publicado. */
  status: "rascunho" | "revisado";
  updatedAt: string;
  /** Uma frase de encanto, até 140 caracteres. */
  hook: string;
  /** O essencial do parque em 2 ou 3 frases. */
  intro: string;
  sourceIds: string[];
  protects: { summary: string; items: GuideItem[] };
  wonders: (GuideItem & { photo: ContextPhoto | null; location?: MapLocation })[];
  curiosities: { text: string; sourceIds: string[] }[];
  stories: GuideItem[];
  /** Espécies-símbolo escolhidas pela edição; a foto vem do levantamento de biodiversidade. */
  flagships: {
    scientificName: string;
    name: string;
    /** Por que é característica deste parque (docs/DESTAQUES.md). */
    criteria?: FlagshipCriterion[];
    /** Categoria IUCN global, quando o destaque não consta do levantamento (scripts/fill-flagship-iucn.mjs). */
    iucn?: IucnCategory | null;
    why: string;
    sourceIds: string[];
    /** Só quando o levantamento de biodiversidade não traz foto da espécie. */
    photo?: ContextPhoto;
  }[];
  sources: GuideSource[];
}

/* ---------- Biodiversidade (gerada) ---------- */

export type IucnCategory = "LC" | "NT" | "VU" | "EN" | "CR" | "EW" | "EX" | "DD";

export interface SpeciesCard {
  gbifKey: number;
  scientificName: string;
  /** Nome popular em português, quando existe. */
  name: string | null;
  family: string | null;
  records: number | null;
  iucn: IucnCategory | null;
  wikidata: string | null;
  photo: Photo | null;
}

export interface Biodiversity {
  generatedAt: string;
  /** Ausente nos levantamentos históricos que priorizavam disponibilidade de fotos. */
  selectionPolicy?: "records-first";
  boundary: string;
  method: string;
  sources: { title: string; url: string; accessed: string }[];
  groups: { id: string; label: string; records: number; species: SpeciesCard[] }[];
  threatened: SpeciesCard[];
}

export type ResearchTheme =
  | "geologia"
  | "hidrografia"
  | "relevo"
  | "clima"
  | "biodiversidade"
  | "conservação"
  | "história"
  | "patrimônio"
  | "arqueologia"
  | "visitação";

/** Descoberta curta, parafraseada da fonte indicada (não é citação). */
export interface ResearchNote {
  title: string;
  body: string;
  theme: ResearchTheme;
  source: { label: string; url: string };
}

/** Divergência entre fontes oficiais, mantida visível até ser conciliada. */
export interface OpenQuestion {
  field: string;
  note: string;
  sources: string[];
}

export interface ParkResearch {
  reviewedAt: string;
  headline: string;
  subtitle: string;
  story: string;
  notes: ResearchNote[];
  openQuestions: OpenQuestion[];
}

/*
 * Expedição: reportagem longa e reutilizável de um parque.
 * Abertura + 1 a 3 momentos + no máximo uma interação + encerramento e fontes.
 * Fica em data/<país>/parks/<parque>/expedition.json, separada do JSX.
 */

/** Foto com legenda que explica o que ela mostra (e o que ela não prova). */
export interface ContextPhoto extends Photo {
  context: string;
}

export interface ExpeditionReference {
  id: string;
  institution: string;
  title: string;
  url: string;
  accessedAt: string;
  use: string;
}

/** Citação precisa: a fonte e onde nela está o fato (ex.: "p. 112", "art. 2º"). */
export interface ExpeditionCitation {
  sourceId: string;
  locator: string;
}

export interface ExpeditionMoment {
  id: string;
  eyebrow: string;
  title: string;
  question: string;
  paragraphs: string[];
  sourceIds: string[];
  /** Fontes com localizador (página, artigo). Aparecem junto das fontes do momento. */
  citations?: ExpeditionCitation[];
  images: ContextPhoto[];
  note?: { title: string; body: string };
  /**
   * Para onde o mapa vai enquanto o momento é lido: um lugar com fonte, ou
   * "entorno" (parque inteiro e áreas vizinhas). Sem campo, volta ao parque.
   */
  map?: { label: string } & ({ location: MapLocation } | { frame: "entorno" });
}

export interface TimelineFeature {
  type: "timeline";
  momentId: string;
  title: string;
  intro: string;
  items: { id: string; year: string; title: string; description: string; sourceIds: string[] }[];
}

/** Comparação fotográfica: mantém imagem, contexto e fontes de cada item. */
export interface PhotoCompareFeature {
  type: "photo_compare";
  momentId: string;
  title: string;
  intro: string;
  items: { id: string; photo: ContextPhoto; title: string; description: string; sourceIds: string[] }[];
}

/** Número de destaque, sempre com a fonte de onde foi tirado. */
export interface KeyFact {
  label: string;
  value: string;
  sourceId: string;
  locator?: string;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  sourceId: string;
}

export interface Expedition {
  schemaVersion: 2;
  /** "Em números": até 6 fatos com fonte, logo após a abertura. */
  keyFacts?: KeyFact[];
  /** Termos técnicos explicados em uma frase. */
  glossary?: GlossaryTerm[];
  officialName: string;
  title: string;
  subtitle: string;
  centralQuestion: string;
  introduction: string[];
  cover: ContextPhoto | null;
  moments: ExpeditionMoment[];
  feature: TimelineFeature | PhotoCompareFeature | null;
  closingTitle: string;
  closing: string;
  references: ExpeditionReference[];
  /** Só expedições aprovadas entram no build de produção. */
  approved: boolean;
  status: string;
  lastVerifiedAt: string;
  photoStatus: string;
  editorialNotes?: string;
}

export interface ExpeditionSummary {
  title: string;
  subtitle: string;
  approved: boolean;
}

export type AttractionType =
  | "cachoeira"
  | "trilha"
  | "mirante"
  | "gruta"
  | "praia"
  | "canion"
  | "poco"
  | "formacao_rochosa"
  | "rio"
  | "lagoa";

export type AccessDifficulty = "facil" | "moderada" | "dificil" | "muito_dificil";

export type AttractionTag =
  | "banho_permitido"
  | "acessivel"
  | "familia"
  | "pet_friendly"
  | "camping"
  | "pernoite"
  | "pouca_estrutura"
  | "ideal_fotografia"
  | "comunidade_tradicional";

export interface Attraction extends PlaceBase {
  level: "attraction";
  type: AttractionType;
  /** Coordenadas não confirmadas ficam "A_VERIFICAR" e o pin não é desenhado. */
  coordinates: Verifiable<LngLat>;
  /** Até 300 caracteres. */
  shortDescription: string;
  longDescription: string;
  photos: Photo[];
  access: {
    difficulty: Verifiable<AccessDifficulty>;
    /** Distância de trilha (só ida), em km. */
    trailDistanceKm: Verifiable<number | null>;
    /** Altura da queda, em metros (cachoeiras). */
    heightM?: Verifiable<number>;
  };
  bestSeason: Verifiable<string>;
  visiting: {
    guideRequired: Verifiable<boolean>;
    entranceFee: Verifiable<boolean>;
    openingHours: Verifiable<string>;
    notes?: string;
  };
  howToGetThere: {
    baseCity: string;
    distanceFromBaseKm: Verifiable<number>;
    directions?: string;
  };
  tags: AttractionTag[];
  sources: Source[];
}

export type PlaceNode = Country | Admin1 | Park | Attraction;

/** Representação leve de um nó para listas e breadcrumb. */
export interface PlaceSummary {
  level: PlaceLevel;
  /** Caminho canônico (para parques, sempre sob o estado canônico). */
  path: string[];
  name: string;
  /** Filhos diretos: parques de um estado, atrações de um parque. */
  count: number;
  biome?: Biome;
  areaHa?: number;
  createdYear?: number | null;
  /** UFs do parque, para mostrar "também em…". */
  ufs?: string[];
  photo?: Photo;
  type?: AttractionType;
}

/**
 * Índice compacto que o cliente recebe uma vez (no layout) e usa no mapa, na
 * busca e no "Surpreenda-me", sem novas requisições durante a navegação.
 */
export interface MapIndex {
  country: string;
  /** Enquadramento do país (inclui parques oceânicos). */
  bbox: BBox;
  admin1: { slug: string; name: string; code: string; labelPoint: LngLat; bbox: BBox; parkCount: number }[];
  parks: {
    slug: string;
    name: string;
    shortName: string;
    admin1: string;
    ufs: string[];
    biome: Biome;
    areaHa: number;
    createdYear: number | null;
    labelPoint: LngLat;
    bbox: BBox;
    /** Miniatura para o cartão de pré-visualização no mapa. */
    thumb: string | null;
  }[];
}
