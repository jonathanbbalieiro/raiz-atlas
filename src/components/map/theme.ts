import { BIOME_COLOR } from "@/lib/labels";

/** Cores do mapa; espelham os tokens de src/app/globals.css. */
export const MAP_COLORS = {
  forest: "#244b3b",
  forestDeep: "#18392e",
  moss: "#7c9a6a",
  earth: "#8f5a32",
  sand: "#eae6dc",
  water: "#2f7a8f",
  paper: "#f8f6f0",
  card: "#fffefa",
  ink: "#26352f",
  muted: "#b9b2a3",
} as const;

/**
 * Mapa de base reestilizado: oceano cinza-azulado suave, terra (vizinhos) em
 * cinza-bege. O Brasil ganha um véu claro por cima (camada admin1-fill).
 */
export const BASEMAP = {
  land: "#d3ebc5",
  water: "#a9cde8",
  waterLine: "#8fbde0",
  foreignBorder: "#a99bb8",
} as const;

/** Cores da natureza no mapa: matas e áreas protegidas em verde suave. */
export const NATURE = { wood: "#8fcb82", park: "#a6d697" } as const;

/**
 * Cobertura vegetal da visão do país e dos estados, em tons de verde: classificação MODIS (NASA, domínio
 * público) recolorida por scripts/build-landcover-tiles.mjs e servida pelo próprio site.
 */
export const overviewSource = (origin: string) => ({
  type: "raster" as const,
  tiles: [`${origin}/tiles/landcover/{z}/{x}/{y}.png`],
  tileSize: 256,
  minzoom: 0,
  maxzoom: 7,
  bounds: [-82, -56, -34, 13] as [number, number, number, number],
  attribution: 'Cobertura vegetal: <a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noopener">NASA MODIS</a>',
});

/** Estilo de base: OpenFreeMap (gratuito, sem chave; dados © OpenStreetMap, ODbL). */
export const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

/**
 * Modelo de elevação para relevo 3D e sombreamento, carregado só ao entrar
 * num parque: Terrain Tiles (AWS Open Data / Mapzen), formato Terrarium.
 */
export const DEM_SOURCE = {
  type: "raster-dem" as const,
  tiles: ["https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"],
  encoding: "terrarium" as const,
  tileSize: 256,
  maxzoom: 14,
  attribution:
    '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Relevo: Terrain Tiles (Mapzen, AWS)</a>',
};

/** Fontes de glifos disponíveis no servidor do OpenFreeMap. */
export const MAP_FONTS = {
  regular: ["Noto Sans Regular"],
  bold: ["Noto Sans Bold"],
};

/** Expressão MapLibre: cor do bioma a partir da propriedade `biome`. */
export const biomeColorExpr = [
  "match",
  ["get", "biome"],
  ...Object.entries(BIOME_COLOR).flat(),
  MAP_COLORS.forest,
] as unknown as string;

/**
 * Cor do pin de atração por família: água (azul), rocha/terra (terra), mata (verde).
 * O nome sempre acompanha a cor no pop-up e no painel.
 */
export const TYPE_COLOR: Record<string, string> = {
  cachoeira: MAP_COLORS.water,
  poco: MAP_COLORS.water,
  rio: MAP_COLORS.water,
  lagoa: MAP_COLORS.water,
  praia: MAP_COLORS.water,
  gruta: MAP_COLORS.earth,
  canion: MAP_COLORS.earth,
  formacao_rochosa: MAP_COLORS.earth,
  trilha: MAP_COLORS.forest,
  mirante: MAP_COLORS.forest,
};
