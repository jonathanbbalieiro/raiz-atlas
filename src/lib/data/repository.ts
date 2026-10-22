import type {
  Admin1,
  Attraction,
  Country,
  Expedition,
  MapIndex,
  Park,
  PlaceNode,
  PlaceSummary,
} from "./types";

/**
 * Contrato de acesso a dados usado por todas as páginas.
 *
 * No MVP a implementação lê JSON versionado (`JsonRepository`). Para migrar
 * para um banco (ex.: Supabase/PostGIS) basta escrever outra classe com esta
 * interface e trocá-la em `./index.ts`; nenhum componente muda.
 */
export interface PlaceRepository {
  listCountries(): Promise<Country[]>;

  /** Resolve qualquer URL da hierarquia, ex.: ["br", "go", "chapada-dos-veadeiros"]. */
  getNode(path: string[]): Promise<PlaceNode | null>;

  /** Filhos diretos de um nó, já resumidos para listas. */
  getChildren(path: string[]): Promise<PlaceSummary[]>;

  /** Resumo de cada ancestral, do país até o próprio nó (para o breadcrumb). */
  getTrail(path: string[]): Promise<PlaceSummary[]>;

  listAdmin1(country: string): Promise<Admin1[]>;
  /** Parques do país, ou só os que tocam uma divisão (inclusive os de URL canônica em outra). */
  listParks(country: string, admin1?: string): Promise<Park[]>;
  listAttractions(country: string, park: string): Promise<Attraction[]>;

  /** Expedição do parque, ou null se não existe ou é rascunho fora da prévia. */
  getExpedition(country: string, park: string): Promise<Expedition | null>;

  /** Parques mais próximos (por distância entre os pontos internos). */
  nearbyParks(park: Park, limit: number): Promise<PlaceSummary[]>;

  /** Índice compacto para o cliente (mapa, busca). */
  getMapIndex(country: string): Promise<MapIndex>;

  /** Todas as URLs publicáveis (para `generateStaticParams` e sitemap). */
  listAllPaths(): Promise<string[][]>;
}
