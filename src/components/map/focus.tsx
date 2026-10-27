"use client";

import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AttractionType, BBox, Biome, LngLat, MapIndex, PlaceLevel } from "@/lib/data/types";

/**
 * O que o mapa deve mostrar. Cada página (server component) calcula isto e
 * entrega via <MapFocus>. O mapa, que vive no layout e nunca desmonta, só
 * reage: a fonte de dados fica no servidor e as páginas continuam estáticas.
 */
export interface MapFocusState {
  country: string;
  level: PlaceLevel;
  path: string[];
  bbox: BBox;
  /** Pins do parque aberto (só os com coordenadas confirmadas). */
  attractions: AttractionPoint[];
  /** Maravilhas do guia com lugar, numeradas na ordem dos cartões do painel. */
  wonders: WonderPoint[];
  /** O parque tem camada de entorno em /geo/<país>/context/<parque>.json. */
  context: boolean;
}

export interface WonderPoint {
  /** Posição do cartão na lista de maravilhas do guia. */
  index: number;
  title: string;
  coordinates: LngLat;
  approximate: boolean;
}

/** Maravilha escolhida no painel ou no mapa; a origem decide quem reage. */
export type ActiveWonder = { index: number; from: "panel" | "map" } | null;
/** Espécie em leitura no explorador: o mapa mostra onde ela foi registrada. */
export type SpeciesLayer = { park: string; gbifKey: number } | null;
/** Lugar do trecho da Expedição em leitura; sem lugar, o mapa volta ao parque. */
export type StoryPlace = { label: string; coordinates: LngLat; approximate: boolean } | { label: string; frame: "entorno" } | null;

export interface AttractionPoint {
  slug: string;
  name: string;
  type: AttractionType;
  coordinates: LngLat;
}

/** Destaque cruzado entre lista e mapa (hover/foco num item da lista). */
export type Highlight = { kind: "park" | "admin1"; slug: string } | null;

interface ExploreState {
  index: MapIndex;
  focus: MapFocusState | null;
  setFocus: (f: MapFocusState) => void;
  /** Biomas visíveis (null = todos). */
  biomes: Biome[] | null;
  toggleBiome: (b: Biome) => void;
  clearBiomes: () => void;
  /** Parques que passam no filtro de biomas (derivado do índice). */
  visibleParks: MapIndex["parks"];
  highlight: Highlight;
  setHighlight: (h: Highlight) => void;
  /** Painel lateral aberto (desktop/tablet); no celular é sempre o bottom sheet. */
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  /**
   * Último contexto "amplo" visitado (visão geral ou estado). O botão de
   * fechar de um parque volta para ele, preservando o caminho do usuário.
   */
  lastContextPath: string | null;
  activeWonder: ActiveWonder;
  setActiveWonder: (w: ActiveWonder) => void;
  speciesLayer: SpeciesLayer;
  setSpeciesLayer: (s: SpeciesLayer) => void;
  storyPlace: StoryPlace;
  setStoryPlace: (p: StoryPlace) => void;
  /** Contador: cada pedido de "ver no mapa" baixa o bottom sheet no celular. */
  mapViewRequest: number;
  requestMapView: () => void;
}

const ExploreContext = createContext<ExploreState | null>(null);

export function ExploreProvider({ index, children }: { index: MapIndex; children: ReactNode }) {
  const [focus, setFocus] = useState<MapFocusState | null>(null);
  const [biomes, setBiomes] = useState<Biome[] | null>(null);
  const [highlight, setHighlight] = useState<Highlight>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeWonder, setActiveWonder] = useState<ActiveWonder>(null);
  const [speciesLayer, setSpeciesLayer] = useState<SpeciesLayer>(null);
  const [storyPlace, setStoryPlace] = useState<StoryPlace>(null);
  const [mapViewRequest, setMapViewRequest] = useState(0);
  const requestMapView = useCallback(() => setMapViewRequest((n) => n + 1), []);

  // Guarda a página anterior se ela era a visão geral ou um estado (até 2
  // segmentos). Ajuste feito no render (estado derivado), sem efeito extra.
  const pathname = usePathname();
  const [nav, setNav] = useState<{ current: string; lastContext: string | null }>({
    current: pathname,
    lastContext: null,
  });
  if (nav.current !== pathname) {
    const wasContext = nav.current.split("/").filter(Boolean).length <= 2;
    setNav({ current: pathname, lastContext: wasContext ? nav.current : nav.lastContext });
    // Escolhas feitas no painel valem só para a página em que foram feitas.
    setActiveWonder(null);
    setStoryPlace(null);
    setSpeciesLayer(null);
  }
  const lastContextPath = nav.lastContext;

  const visibleParks = useMemo(
    () => (biomes ? index.parks.filter((p) => biomes.includes(p.biome)) : index.parks),
    [index, biomes],
  );

  const value = useMemo<ExploreState>(
    () => ({
      index,
      focus,
      setFocus,
      biomes,
      toggleBiome: (b) =>
        setBiomes((cur) => {
          // Primeiro clique isola o bioma; os seguintes somam ou removem.
          if (!cur) return [b];
          const next = cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b];
          return next.length ? next : null;
        }),
      clearBiomes: () => setBiomes(null),
      visibleParks,
      highlight,
      setHighlight,
      panelOpen,
      setPanelOpen,
      lastContextPath,
      activeWonder,
      setActiveWonder,
      speciesLayer,
      setSpeciesLayer,
      storyPlace,
      setStoryPlace,
      mapViewRequest,
      requestMapView,
    }),
    [index, focus, biomes, visibleParks, highlight, panelOpen, lastContextPath, activeWonder, speciesLayer, storyPlace, mapViewRequest, requestMapView],
  );
  return <ExploreContext.Provider value={value}>{children}</ExploreContext.Provider>;
}

export function useExplore() {
  const ctx = useContext(ExploreContext);
  if (!ctx) throw new Error("useExplore fora de <ExploreProvider>");
  return ctx;
}

/** Componente sem UI: publica o foco da página atual para o mapa. */
export function MapFocus(props: MapFocusState) {
  const { setFocus } = useExplore();
  // A chave serializada evita reaplicar o foco quando só a identidade do objeto muda.
  const key = JSON.stringify(props);
  useEffect(() => {
    setFocus(JSON.parse(key) as MapFocusState);
  }, [key, setFocus]);
  return null;
}
