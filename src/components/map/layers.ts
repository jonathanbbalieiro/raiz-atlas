import type { ExpressionSpecification, FilterSpecification, Map as MlMap } from "maplibre-gl";
import { MAP_COLORS as C, MAP_FONTS, TYPE_COLOR, biomeColorExpr } from "./theme";

/**
 * Camadas clicáveis, na ordem de prioridade do clique. As "-hit" são
 * invisíveis e maiores que o símbolo: área de toque generosa sem poluir o mapa.
 */
export const INTERACTIVE_LAYERS = [
  "attraction-clusters",
  "attraction-hit",
  "park-clusters",
  "park-hit",
  "parks-fill",
  "admin1-fill",
] as const;

const EMPTY = { type: "FeatureCollection" as const, features: [] };

/**
 * Limites de país e estados são simplificados para a visão nacional; de perto
 * eles cortariam a costa em linhas retas. Acima deste zoom quem desenha as
 * divisas é o mapa de base, que é detalhado.
 */
const NATIONAL_MAXZOOM = 7.8;
/** Acima deste zoom os parques não se agrupam mais (evita clusters confusos de perto). */
export const PARK_CLUSTER_MAXZOOM = 6;

/** Primeira camada de rótulos do basemap: nossas áreas ficam por baixo dos nomes. */
function firstLabelLayer(map: MlMap) {
  return map.getStyle().layers.find((l) => l.type === "symbol")?.id;
}

const typeColorExpr = [
  "match",
  ["get", "type"],
  ...Object.entries(TYPE_COLOR).flat(),
  C.forest,
] as unknown as string;

const state = (key: string): ExpressionSpecification => ["boolean", ["feature-state", key], false];

/**
 * Cria todas as fontes (vazias) e camadas uma única vez. Depois disso o mapa só
 * troca dados, filtros, feature-state e visibilidade: nada é remontado.
 */
export function addLayers(map: MlMap) {
  const beforeLabels = firstLabelLayer(map);

  map.addSource("admin1", { type: "geojson", data: EMPTY, promoteId: "slug" });
  map.addSource("outline", { type: "geojson", data: EMPTY });
  map.addSource("parks", { type: "geojson", data: EMPTY, promoteId: "slug" });
  map.addSource("park-detail", { type: "geojson", data: EMPTY });
  // Pontos dos parques com agrupamento nativo. Os dados chegam já filtrados por
  // bioma, então as contagens dos grupos sempre refletem o que está visível.
  map.addSource("park-points", {
    type: "geojson",
    data: EMPTY,
    cluster: true,
    // Raio pequeno: só agrupa parques que de fato se sobreporiam na tela.
    clusterRadius: 22,
    clusterMaxZoom: PARK_CLUSTER_MAXZOOM,
  });
  map.addSource("attractions", {
    type: "geojson",
    data: EMPTY,
    cluster: true,
    clusterRadius: 40,
    clusterMaxZoom: 12,
  });

  /*
   * Estados. O Brasil fica levemente "iluminado" em relação aos vizinhos; com
   * um estado aberto, ele fica mais claro e os demais recuam (sem sumir).
   */
  map.addLayer(
    {
      id: "admin1-fill",
      type: "fill",
      source: "admin1",
      maxzoom: NATIONAL_MAXZOOM,
      paint: {
        "fill-color": ["case", state("dimmed"), C.ink, state("hover"), C.forest, C.card],
        "fill-opacity": ["case", state("current"), 0.35, state("dimmed"), 0.3, state("hover"), 0.1, 0],
        "fill-opacity-transition": { duration: 300 },
      },
    },
    beforeLabels,
  );
  map.addLayer(
    {
      id: "admin1-line",
      type: "line",
      source: "admin1",
      maxzoom: NATIONAL_MAXZOOM,
      paint: {
        "line-color": "#9a9590",
        "line-opacity": 0.7,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 6, 0.9, 8, 1.3],
      },
    },
    beforeLabels,
  );

  // Parques (geometria leve de todos): preenchimento translúcido do bioma, contorno fino.
  map.addLayer(
    {
      id: "parks-fill",
      type: "fill",
      source: "parks",
      paint: {
        "fill-color": biomeColorExpr,
        "fill-opacity": ["case", state("current"), 0, state("hover"), 0.58, state("dimmed"), 0.1, 0.32],
        "fill-opacity-transition": { duration: 200 },
      },
    },
    beforeLabels,
  );
  map.addLayer(
    {
      id: "parks-line",
      type: "line",
      source: "parks",
      paint: {
        "line-color": biomeColorExpr,
        "line-width": ["case", state("hover"), 1.8, 0.7],
        "line-opacity": ["case", state("current"), 0, state("dimmed"), 0.25, 0.85],
      },
    },
    beforeLabels,
  );

  // Contorno nacional: verde-escuro discreto.
  map.addLayer(
    {
      id: "outline",
      type: "line",
      source: "outline",
      maxzoom: NATIONAL_MAXZOOM,
      paint: {
        "line-color": C.forest,
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.9, 7, 1.6],
        "line-opacity": 0.8,
      },
    },
    beforeLabels,
  );
  // Estado aberto: traço próprio por cima das divisas vizinhas.
  map.addLayer(
    {
      id: "admin1-current",
      type: "line",
      source: "admin1",
      maxzoom: NATIONAL_MAXZOOM,
      filter: ["==", ["get", "slug"], ""],
      paint: { "line-color": C.forest, "line-width": 2 },
    },
    beforeLabels,
  );

  // Parque selecionado: geometria detalhada, halo claro e contorno escuro.
  map.addLayer(
    {
      id: "park-detail-fill",
      type: "fill",
      source: "park-detail",
      paint: { "fill-color": biomeColorExpr, "fill-opacity": 0.2 },
    },
    beforeLabels,
  );
  map.addLayer({
    id: "park-detail-halo",
    type: "line",
    source: "park-detail",
    paint: { "line-color": "#ffffff", "line-width": 5, "line-opacity": 0.85 },
  });
  map.addLayer({
    id: "park-detail-line",
    type: "line",
    source: "park-detail",
    paint: { "line-color": C.forestDeep, "line-width": 1.8 },
  });

  // Parques individuais: alvo de toque invisível + marcador pequeno.
  const single: FilterSpecification = ["!", ["has", "point_count"]];
  const cluster: FilterSpecification = ["has", "point_count"];
  map.addLayer({
    id: "park-hit",
    type: "circle",
    source: "park-points",
    filter: single,
    paint: { "circle-radius": 14, "circle-color": "#000000", "circle-opacity": 0 },
  });
  map.addLayer({
    id: "park-dots",
    type: "circle",
    source: "park-points",
    filter: single,
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        3,
        ["case", state("hover"), 6.5, 4.5],
        7,
        ["case", state("hover"), 8.5, 6.5],
      ],
      "circle-radius-transition": { duration: 150 },
      "circle-color": biomeColorExpr,
      "circle-stroke-color": C.card,
      "circle-stroke-width": ["case", state("hover"), 2.5, 1.6],
      "circle-opacity": ["case", state("dimmed"), 0.3, 1],
      "circle-stroke-opacity": ["case", state("dimmed"), 0.3, 1],
    },
  });
  map.addLayer({
    id: "park-labels",
    type: "symbol",
    source: "park-points",
    filter: single,
    minzoom: 5.2,
    layout: {
      "text-field": ["get", "shortName"],
      "text-font": MAP_FONTS.bold,
      "text-size": ["interpolate", ["linear"], ["zoom"], 5, 11, 9, 13],
      "text-variable-anchor": ["top", "bottom", "right", "left"],
      "text-radial-offset": 0.75,
      "text-max-width": 9,
      "text-optional": true,
    },
    paint: {
      "text-color": C.ink,
      "text-halo-color": C.card,
      "text-halo-width": 1.6,
      "text-opacity": ["case", state("dimmed"), 0.4, 1],
    },
  });

  // Grupos de parques: claros, com aro verde, número legível. Distintos dos parques (que são coloridos).
  map.addLayer({
    id: "park-clusters",
    type: "circle",
    source: "park-points",
    filter: cluster,
    paint: {
      "circle-color": C.card,
      "circle-radius": ["step", ["get", "point_count"], 12, 5, 15, 10, 18],
      "circle-stroke-color": C.forest,
      "circle-stroke-width": ["case", state("hover"), 2.6, 1.5],
    },
  });
  map.addLayer({
    id: "park-cluster-count",
    type: "symbol",
    source: "park-points",
    filter: cluster,
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": MAP_FONTS.bold,
      "text-size": 12,
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: { "text-color": C.forestDeep },
  });

  // Atrações do parque aberto (mesma linguagem visual dos parques).
  map.addLayer({
    id: "attraction-clusters",
    type: "circle",
    source: "attractions",
    filter: cluster,
    paint: {
      "circle-color": C.card,
      "circle-radius": ["step", ["get", "point_count"], 13, 5, 16, 10, 19],
      "circle-stroke-color": C.forest,
      "circle-stroke-width": ["case", state("hover"), 2.6, 1.5],
    },
  });
  map.addLayer({
    id: "attraction-cluster-count",
    type: "symbol",
    source: "attractions",
    filter: cluster,
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": MAP_FONTS.bold,
      "text-size": 12,
      "text-allow-overlap": true,
    },
    paint: { "text-color": C.forestDeep },
  });
  map.addLayer({
    id: "attraction-hit",
    type: "circle",
    source: "attractions",
    filter: single,
    paint: { "circle-radius": 16, "circle-color": "#000000", "circle-opacity": 0 },
  });
  map.addLayer({
    id: "attraction-selected",
    type: "circle",
    source: "attractions",
    filter: ["==", ["get", "slug"], ""],
    paint: {
      "circle-radius": 14,
      "circle-color": "rgba(255,255,255,0.5)",
      "circle-stroke-color": C.forestDeep,
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "attractions",
    type: "circle",
    source: "attractions",
    filter: single,
    paint: {
      "circle-radius": ["case", state("hover"), 8.5, 7],
      "circle-color": typeColorExpr,
      "circle-stroke-color": C.card,
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "attraction-labels",
    type: "symbol",
    source: "attractions",
    filter: single,
    layout: {
      "text-field": ["get", "name"],
      "text-font": MAP_FONTS.bold,
      "text-size": 12,
      "text-variable-anchor": ["top", "bottom", "right", "left"],
      "text-radial-offset": 0.9,
      "text-max-width": 9,
      "text-optional": true,
    },
    paint: { "text-color": C.ink, "text-halo-color": C.card, "text-halo-width": 1.6 },
  });
}

/** Liga/desliga grupos de camadas conforme o nível da hierarquia. */
export function setLayerGroupVisible(map: MlMap, ids: readonly string[], visible: boolean) {
  for (const id of ids) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
  }
}

export const LAYER_GROUPS = {
  parkDetail: ["park-detail-fill", "park-detail-halo", "park-detail-line"],
  attractions: [
    "attraction-clusters",
    "attraction-cluster-count",
    "attraction-hit",
    "attraction-selected",
    "attractions",
    "attraction-labels",
  ],
} as const;

export const selectedFilter = (slug: string): FilterSpecification => ["==", ["get", "slug"], slug];

/** Filtro por biomas selecionados (null = todos). */
export const biomeFilter = (biomes: string[] | null): FilterSpecification | null =>
  biomes ? ["in", ["get", "biome"], ["literal", biomes]] : null;
