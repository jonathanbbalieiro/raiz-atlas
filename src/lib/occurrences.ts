/** Grade de registros por espécie gerada por scripts/build-occurrence-grid.mjs. */
export interface OccurrenceGrid {
  generatedAt: string;
  boundary: string;
  source: { title: string; url: string };
  method: string;
  /** Por chave GBIF: tamanho do quadrado em graus e [oeste, sul, registros] de cada quadrado. */
  species: Record<string, { cell: number; records: number; cells: [number, number, number][] }>;
}

const cache = new Map<string, Promise<OccurrenceGrid | null>>();

/** Uma requisição por parque, compartilhada entre o mapa e a ficha da espécie. */
export function loadOccurrences(country: string, park: string): Promise<OccurrenceGrid | null> {
  const url = `/geo/${country}/occurrences/${park}.json`;
  if (!cache.has(url)) {
    cache.set(url, fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return cache.get(url)!;
}

/**
 * Quadrados como polígonos e o centro de cada um como ponto (para a visão de
 * longe), com a fração do maior quadrado para a intensidade da cor.
 */
export function occurrenceFeatures(entry: OccurrenceGrid["species"][string]): GeoJSON.FeatureCollection {
  const max = Math.max(1, ...entry.cells.map(([, , n]) => n));
  const half = entry.cell / 2;
  return {
    type: "FeatureCollection",
    features: entry.cells.flatMap(([x, y, n]): GeoJSON.Feature[] => {
      const properties = { records: n, share: n / max };
      return [
        {
          type: "Feature",
          properties,
          geometry: {
            type: "Polygon",
            coordinates: [[[x, y], [x + entry.cell, y], [x + entry.cell, y + entry.cell], [x, y + entry.cell], [x, y]]],
          },
        },
        { type: "Feature", properties, geometry: { type: "Point", coordinates: [x + half, y + half] } },
      ];
    }),
  };
}

/** Tamanho aproximado do quadrado em km, para a legenda. */
export const cellKm = (degrees: number) => Math.round(degrees * 111);
