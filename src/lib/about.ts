/** Fontes de dados do Raiz, compartilhadas pela página /sobre e pela aba "Sobre" do painel. */
export const SOURCES = [
  { name: "ICMBio", use: "limites, áreas, atos de criação, planos de manejo e fichas dos parques", url: "https://www.gov.br/icmbio" },
  { name: "IBGE", use: "malha de estados e municípios", url: "https://www.ibge.gov.br" },
  { name: "GBIF", use: "registros de espécies dentro do limite de cada parque", url: "https://www.gbif.org" },
  { name: "Flora e Funga do Brasil (JBRJ)", use: "origem das plantas (nativa, exótica, cultivada)", url: "https://floradobrasil.jbrj.gov.br" },
  { name: "Wikimedia Commons e Wikidata", use: "fotografias livres, nomes populares e situação de conservação", url: "https://commons.wikimedia.org" },
  { name: "iNaturalist", use: "fotografias de espécies e nomes populares", url: "https://www.inaturalist.org" },
  { name: "NASA MODIS (GIBS)", use: "cobertura vegetal do mapa, recolorida pelo Raiz; dados de domínio público", url: "https://earthdata.nasa.gov/gibs" },
  { name: "OpenFreeMap e OpenStreetMap", use: "nomes, água e limites do mapa de base", url: "https://openfreemap.org" },
  { name: "Terrain Tiles (Mapzen, AWS)", use: "relevo em 3D", url: "https://registry.opendata.aws/terrain-tiles/" },
] as const;
