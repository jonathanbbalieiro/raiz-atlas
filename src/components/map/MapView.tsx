"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type {
  GeoJSONSource,
  Map as MlMap,
  MapGeoJSONFeature,
  MapMouseEvent,
  PaddingOptions,
  Popup,
} from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BIOME_COLOR, BIOME_LABEL, href, plural } from "@/lib/labels";
import { useExplore, type MapFocusState } from "./focus";
import {
  INTERACTIVE_LAYERS,
  LAYER_GROUPS,
  addLayers,
  biomeFilter,
  selectedFilter,
  setLayerGroupVisible,
} from "./layers";
import { MapControls } from "./MapControls";
import { BASEMAP, BASEMAP_STYLE, DEM_SOURCE, overviewSource } from "./theme";

type FC = GeoJSON.FeatureCollection;
const EMPTY: FC = { type: "FeatureCollection", features: [] };

/**
 * Câmera por nível. Nos níveis nacional e estadual o mapa fica plano (leitura
 * cartográfica); dentro do parque, uma inclinação moderada revela o relevo.
 */
const CAMERA = {
  country: { pitch: 0, bearing: 0, maxZoom: 5.2, duration: 900 },
  admin1: { pitch: 0, bearing: 0, maxZoom: 7.5, duration: 1100 },
  park: { pitch: 45, bearing: -10, maxZoom: 12, duration: 1600 },
  attraction: { pitch: 52, bearing: -18, maxZoom: 14, duration: 1400 },
} as const;

interface Props {
  /** Área ocupada pelo painel/bottom sheet, para o enquadramento não ficar por baixo dele. */
  getPadding: () => PaddingOptions;
}

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isNarrow = () => window.innerWidth < 768;
const RELIEF_KEY = "raiz:relevo-3d";

export function MapView({ getPadding }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  /** O usuário moveu o mapa para longe do enquadramento da seleção atual. */
  const [drifted, setDrifted] = useState(false);
  const { index, focus, biomes, visibleParks, highlight, setHighlight, panelOpen } = useExplore();
  const router = useRouter();
  /**
   * Relevo 3D (terreno inclinado) é opcional e começa desligado: é o recurso
   * mais caro do mapa (redesenha todas as camadas sobre a malha de terreno a
   * cada quadro) e travava em GPUs integradas. O sombreamento 2D continua.
   */
  // Lido no inicializador: nada que dependa dele é renderizado antes de o mapa ficar pronto (só no cliente).
  const [relief3d, setRelief3d] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(RELIEF_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Os handlers do MapLibre são registrados uma vez e leem os valores atuais por ref.
  const live = useRef({ focus, index, router, getPadding, setHighlight, relief3d });
  useLayoutEffect(() => {
    live.current = { focus, index, router, getPadding, setHighlight, relief3d };
  });

  const geoCache = useRef(new Map<string, Promise<unknown>>());
  const applied = useRef({ first: true, country: "", parkDetail: "" });

  /** Aplica o enquadramento do foco atual (usado na navegação e no botão "recentralizar"). */
  // Estável: só usa refs e o setter de estado.
  const applyFrame = useCallback((f: MapFocusState, animate: boolean) => {
    const map = mapRef.current;
    if (!map) return;
    const cam = live.current.relief3d ? CAMERA[f.level] : { ...CAMERA[f.level], pitch: 0, bearing: 0 };
    const pitch = isNarrow() ? Math.min(cam.pitch, 35) : cam.pitch;
    const padding = live.current.getPadding();
    const target = map.cameraForBounds(f.bbox, { padding, bearing: cam.bearing, maxZoom: cam.maxZoom });
    if (!target) return;
    map.flyTo({
      // cameraForBounds já desloca o centro para a área livre (fora do painel/
      // sheet). O padding NÃO vai no voo: seria aplicado duas vezes, e o
      // MapLibre o guardaria para as próximas operações.
      ...target,
      // Com inclinação, recua um pouco para a área inteira caber na tela.
      zoom: (target.zoom ?? 4) - (pitch ? 0.6 : 0),
      pitch,
      bearing: cam.bearing,
      duration: animate && !reduceMotion() ? cam.duration : 0,
      curve: 1.4,
      essential: true,
    });
    setDrifted(false);
  }, []);

  /* 1. Criação do mapa (uma vez). maplibre-gl é importado sob demanda. */
  useEffect(() => {
    let map: MlMap | undefined;
    let cancelled = false;
    (async () => {
      const maplibregl = await import("maplibre-gl");
      maplibregl.setWorkerUrl(`${window.location.origin}/maplibre/maplibre-gl-worker.mjs`);
      if (cancelled || !containerRef.current) return;
      map = new maplibregl.Map({
        container: containerRef.current,
        style: BASEMAP_STYLE,
        // Enquadramento inicial calculado dos limites reais (inclui ilhas oceânicas),
        // descontando a área do painel. Sem repetição horizontal do mundo.
        bounds: live.current.index.bbox,
        fitBoundsOptions: { padding: live.current.getPadding() },
        minZoom: 2.4,
        maxPitch: 60,
        renderWorldCopies: false,
        attributionControl: { compact: true },
      });
      map.touchZoomRotate.disableRotation();
      mapRef.current = map;
      // Acesso para depuração no console durante o desenvolvimento.
      if (process.env.NODE_ENV === "development") Object.assign(window, { __map: map });

      const popup: Popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 14,
        className: "map-tip",
      });
      let hovered: { source: string; id: string | number }[] = [];
      const clearHover = () => {
        for (const h of hovered) map!.setFeatureState(h, { hover: false });
        hovered = [];
      };

      map.on("style.load", () => {
        restyleBasemap(map!);
        addLayers(map!);
        map!.setSky({
          "sky-color": "#d5e3e6",
          "horizon-color": "#efece4",
          "fog-color": "#efece4",
          "sky-horizon-blend": 0.6,
          "horizon-fog-blend": 0.5,
          "fog-ground-blend": 0.8,
        });
        setReady(true);
      });

      // Movimento iniciado pelo usuário (arrastar, roda, pinça) => oferece "recentralizar".
      map.on("movestart", (e) => {
        if ((e as { originalEvent?: Event }).originalEvent) setDrifted(true);
      });

      /*
       * Hover: no máximo uma consulta por quadro (rAF). Destaque, tooltip e
       * prefetch só mudam quando muda o elemento sob o cursor; no mesmo
       * elemento, o tooltip apenas acompanha o mouse. Antes, cada pixel de
       * movimento apagava e reaplicava o feature-state (forçando redesenho),
       * recriava o DOM do tooltip e pedia um prefetch.
       */
      let hoverKey = "";
      let hoverEvent: MapMouseEvent | null = null;
      let hoverFrame = 0;
      map.on("mousemove", (e) => {
        // Arrastando o mapa: nada de hover (evita consultas a cada quadro do arraste).
        if ((e.originalEvent as MouseEvent).buttons) return;
        hoverEvent = e;
        if (!hoverFrame) hoverFrame = requestAnimationFrame(() => {
          hoverFrame = 0;
          if (hoverEvent) onHover(hoverEvent);
        });
      });
      const onHover = (e: MapMouseEvent) => {
        const f = topFeature(map!, e.point);
        const { focus: fo, index: idx, router: r } = live.current;
        const key = f && fo ? `${fo.path.join("/")}|${f.layer.id}|${f.id ?? f.properties.slug ?? ""}` : "";
        if (key === hoverKey) {
          if (key) popup.setLngLat(e.lngLat);
          return;
        }
        hoverKey = key;
        map!.getCanvas().style.cursor = f ? "pointer" : "";
        clearHover();
        if (!f || !fo) {
          popup.remove();
          return;
        }
        const p = f.properties;
        const tip = (title: string, sub?: string, color?: string) =>
          popup
            .setLngLat(e.lngLat)
            .setDOMContent(tipContent(title, sub, color))
            .addTo(map!);

        switch (f.layer.id) {
          case "park-hit":
          case "parks-fill": {
            const i = idx.parks.findIndex((x) => x.slug === p.slug);
            const park = idx.parks[i];
            if (!park) break;
            hovered = [
              { source: "parks", id: park.slug },
              { source: "park-points", id: i },
            ];
            tip(
              park.shortName,
              `${BIOME_LABEL[park.biome]} · ${park.ufs.join(", ")}`,
              BIOME_COLOR[park.biome],
            );
            r.prefetch(href([idx.country, park.admin1, park.slug]));
            break;
          }
          case "park-clusters":
            hovered = [{ source: "park-points", id: f.id! }];
            tip(plural(p.point_count, "parque", "parques"), "Clique para aproximar");
            break;
          case "attraction-clusters":
            hovered = [{ source: "attractions", id: f.id! }];
            tip(plural(p.point_count, "atração", "atrações"), "Clique para aproximar");
            break;
          case "attraction-hit":
            tip(p.name);
            break;
          case "admin1-fill": {
            const a = idx.admin1.find((x) => x.slug === p.slug);
            if (!a || fo.path[1] === a.slug) {
              popup.remove();
              break;
            }
            hovered = [{ source: "admin1", id: a.slug }];
            tip(
              a.name,
              a.parkCount
                ? plural(a.parkCount, "parque nacional", "parques nacionais")
                : "Sem parque nacional",
            );
            r.prefetch(href([idx.country, a.slug]));
            break;
          }
        }
        for (const h of hovered) map!.setFeatureState(h, { hover: true });
      };
      map.on("mouseout", () => {
        cancelAnimationFrame(hoverFrame);
        hoverFrame = 0;
        hoverEvent = null;
        hoverKey = "";
        clearHover();
        popup.remove();
      });

      map.on("click", async (e) => {
        const f = topFeature(map!, e.point);
        const { focus: fo, index: idx, router: r } = live.current;
        if (!f || !fo) return;
        const p = f.properties;
        let target: string[];
        switch (f.layer.id) {
          case "park-clusters":
          case "attraction-clusters": {
            const source = f.layer.id === "park-clusters" ? "park-points" : "attractions";
            const zoom = await (map!.getSource(source) as GeoJSONSource).getClusterExpansionZoom(
              p.cluster_id,
            );
            // Centraliza o grupo na área livre via `offset` (o padding ficaria
            // gravado no mapa e distorceria os próximos enquadramentos).
            const pad = live.current.getPadding();
            map!.easeTo({
              center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoom + 0.3,
              offset: [((pad.left ?? 0) - (pad.right ?? 0)) / 2, ((pad.top ?? 0) - (pad.bottom ?? 0)) / 2],
              duration: reduceMotion() ? 0 : 500,
            });
            return;
          }
          case "attraction-hit":
            target = [...fo.path.slice(0, 3), p.slug];
            break;
          case "park-hit":
          case "parks-fill": {
            const park = idx.parks.find((x) => x.slug === p.slug);
            if (!park) return;
            target = [idx.country, park.admin1, park.slug];
            break;
          }
          default:
            target = [idx.country, p.slug];
        }
        // Clicar na área que já está aberta não faz nada (evita "voltar" sem querer).
        if (fo.path.join("/").startsWith(target.join("/"))) return;
        popup.remove();
        r.push(href(target), { scroll: false });
      });
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  const fetchGeo = <T,>(url: string) => {
    if (!geoCache.current.has(url)) {
      geoCache.current.set(
        url,
        fetch(url)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      );
    }
    return geoCache.current.get(url) as Promise<T | null>;
  };

  /* 2. Dados do país (uma vez por país): estados, contorno e parques. */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || applied.current.country === index.country) return;
    applied.current.country = index.country;
    const c = index.country;
    (async () => {
      const [{ feature }, topo, outline, parks] = await Promise.all([
        import("topojson-client"),
        fetchGeo<TopoJSON.Topology>(`/geo/${c}/admin1.json`),
        fetchGeo<FC>(`/geo/${c}/outline.json`),
        fetchGeo<FC>(`/geo/${c}/parks.json`),
      ]);
      if (topo) {
        const fc = feature(topo, topo.objects.admin1) as unknown as FC;
        (map.getSource("admin1") as GeoJSONSource).setData(fc);
      }
      if (outline) (map.getSource("outline") as GeoJSONSource).setData(outline);
      if (parks) (map.getSource("parks") as GeoJSONSource).setData(parks);
    })();
  }, [ready, index]);

  /*
   * 3. Pontos dos parques: refeitos quando o filtro ou o parque aberto mudam.
   * Os agrupamentos são recalculados pelo próprio MapLibre a partir disso.
   */
  const currentPark = focus?.path[2];
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const visible = new Set(visibleParks.map((p) => p.slug));
    (map.getSource("park-points") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: index.parks.flatMap((p, i) =>
        visible.has(p.slug) && p.slug !== currentPark
          ? [
              {
                type: "Feature" as const,
                // id numérico estável (posição no índice) para o feature-state de hover.
                id: i,
                properties: { slug: p.slug, shortName: p.shortName, biome: p.biome },
                geometry: { type: "Point" as const, coordinates: p.labelPoint },
              },
            ]
          : [],
      ),
    });
    const f = biomeFilter(biomes);
    map.setFilter("parks-fill", f);
    map.setFilter("parks-line", f);
  }, [ready, index, visibleParks, biomes, currentPark]);

  /* 4. Reação ao foco: destaque por nível, parque detalhado, relevo e câmera. */
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus) return;
    let stale = false;
    const { level, path } = focus;
    const [, currentAdmin1, park, currentAttraction] = path;
    const deep = level === "park" || level === "attraction";
    const admin1Code = index.admin1.find((a) => a.slug === currentAdmin1)?.code;

    for (const a of index.admin1) {
      map.setFeatureState(
        { source: "admin1", id: a.slug },
        { current: a.slug === currentAdmin1, dimmed: !!currentAdmin1 && a.slug !== currentAdmin1 },
      );
    }
    map.setFilter("admin1-current", ["==", ["get", "slug"], currentAdmin1 ?? ""]);
    index.parks.forEach((p, i) => {
      const dimmed =
        (level === "admin1" && !!admin1Code && !p.ufs.includes(admin1Code)) || (deep && p.slug !== park);
      map.setFeatureState({ source: "parks", id: p.slug }, { current: p.slug === park, dimmed });
      map.setFeatureState({ source: "park-points", id: i }, { dimmed });
    });

    setLayerGroupVisible(map, LAYER_GROUPS.parkDetail, deep);
    setLayerGroupVisible(map, LAYER_GROUPS.attractions, deep);
    (map.getSource("attractions") as GeoJSONSource).setData({
      type: "FeatureCollection",
      features: focus.attractions.map((a, i) => ({
        type: "Feature",
        id: i,
        properties: { slug: a.slug, name: a.name, type: a.type },
        geometry: { type: "Point", coordinates: a.coordinates },
      })),
    });
    map.setFilter("attraction-selected", selectedFilter(currentAttraction ?? ""));

    (async () => {
      if (deep && applied.current.parkDetail !== park) {
        const detail = await fetchGeo<GeoJSON.Feature>(`/geo/${focus.country}/parks/${park}.json`);
        if (stale) return;
        (map.getSource("park-detail") as GeoJSONSource).setData(detail ?? EMPTY);
        applied.current.parkDetail = park;
      }
      setTerrain(map, deep, live.current.relief3d);
      const animate = !applied.current.first;
      applied.current.first = false;
      applyFrame(focus, animate);
    })();
    return () => {
      stale = true;
    };
  }, [focus, ready, index, applyFrame]);

  /* 4b. Liga/desliga o relevo 3D: só reenquadra se houver parque aberto. */
  const firstRelief = useRef(true);
  useEffect(() => {
    if (firstRelief.current) {
      firstRelief.current = false;
      return;
    }
    const map = mapRef.current;
    const deep = focus?.level === "park" || focus?.level === "attraction";
    if (!ready || !map || !focus || !deep) return;
    setTerrain(map, true, relief3d);
    applyFrame(focus, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage ao botão
  }, [relief3d]);

  /* 5. Painel aberto/recolhido muda a área útil: reenquadra. */
  const firstPanel = useRef(true);
  useEffect(() => {
    if (firstPanel.current) {
      firstPanel.current = false;
      return;
    }
    if (focus) applyFrame(focus, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage ao painel
  }, [panelOpen]);

  /* 6. Destaque vindo da lista do painel. */
  const lastHighlight = useRef<typeof highlight>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const apply = (h: typeof highlight, on: boolean) => {
      if (!h) return;
      if (h.kind === "admin1") {
        map.setFeatureState({ source: "admin1", id: h.slug }, { hover: on });
        return;
      }
      const i = index.parks.findIndex((p) => p.slug === h.slug);
      map.setFeatureState({ source: "parks", id: h.slug }, { hover: on });
      if (i >= 0) map.setFeatureState({ source: "park-points", id: i }, { hover: on });
    };
    apply(lastHighlight.current, false);
    apply(highlight, true);
    lastHighlight.current = highlight;
  }, [highlight, ready, index]);

  return (
    // Wrapper posicionado: o CSS do MapLibre força `position: relative` no próprio contêiner.
    <div className="absolute inset-0 z-0" style={{ background: BASEMAP.water }}>
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label="Mapa interativo dos parques nacionais. Todo o conteúdo também está no painel, em forma de lista."
      />
      <MapControls
        ready={ready}
        drifted={drifted && !!focus}
        onZoomIn={() => mapRef.current?.zoomIn({ duration: 200 })}
        onZoomOut={() => mapRef.current?.zoomOut({ duration: 200 })}
        onRecenter={() => focus && applyFrame(focus, true)}
        onHome={() => {
          if (!focus || focus.level === "country") {
            if (focus) applyFrame(focus, true);
          } else router.push("/", { scroll: false });
        }}
        atHome={!focus || focus.level === "country"}
        relief3d={focus?.level === "park" || focus?.level === "attraction" ? relief3d : undefined}
        onToggleRelief={() =>
          setRelief3d((on) => {
            try {
              localStorage.setItem(RELIEF_KEY, on ? "0" : "1");
            } catch {}
            return !on;
          })
        }
      />
    </div>
  );
}

/** Feição clicável mais alta sob o cursor, considerando só camadas visíveis. */
function topFeature(map: MlMap, point: { x: number; y: number }): MapGeoJSONFeature | null {
  const layers = INTERACTIVE_LAYERS.filter((id) => map.getLayoutProperty(id, "visibility") !== "none");
  const hits = map.queryRenderedFeatures([point.x, point.y], { layers: [...layers] });
  // Ordem de prioridade fixa, independentemente da ordem de desenho.
  for (const id of INTERACTIVE_LAYERS) {
    const h = hits.find((x) => x.layer.id === id);
    if (h) return h;
  }
  return null;
}

/** Conteúdo do tooltip (nós DOM, sem HTML interpolado). */
function tipContent(title: string, sub?: string, color?: string) {
  const root = document.createElement("div");
  const t = document.createElement("div");
  t.className = "map-tip-title";
  if (color) {
    const dot = document.createElement("span");
    dot.className = "map-tip-dot";
    dot.style.background = color;
    t.appendChild(dot);
  }
  t.appendChild(document.createTextNode(title));
  root.appendChild(t);
  if (sub) {
    const s = document.createElement("div");
    s.className = "map-tip-sub";
    s.textContent = sub;
    root.appendChild(s);
  }
  return root;
}

/** Relevo 3D + sombreamento: só dentro de parques (economiza tiles nos níveis altos). */
/** Sombreamento 2D sempre que há parque aberto; terreno 3D só se pedido. */
function setTerrain(map: MlMap, on: boolean, relief3d: boolean) {
  if (relief3d && on && !map.getSource("dem")) map.addSource("dem", DEM_SOURCE);
  if (!map.getSource("dem-shade")) {
    map.addSource("dem-shade", DEM_SOURCE);
    // Abaixo da água: o oceano (que também tem relevo no modelo) fica liso, só a terra recebe sombra.
    const firstSymbol = map.getLayer("water") ? "water" : map.getStyle().layers.find((l) => l.type === "symbol")?.id;
    map.addLayer(
      {
        id: "hillshade",
        type: "hillshade",
        source: "dem-shade",
        paint: {
          "hillshade-shadow-color": "#7d7a70",
          "hillshade-highlight-color": "#ffffff",
          "hillshade-accent-color": "#9b978b",
          "hillshade-exaggeration": 0.3,
        },
      },
      firstSymbol,
    );
  }
  // O sombreamento do relevo fica sempre visível (visual de mapa de trilhas); só o 3D depende do parque.
  map.setTerrain(on && relief3d ? { source: "dem", exaggeration: 1.3 } : null);
}

/**
 * Detalhe da cobertura em zoom alto: a imagem MODIS tem pixels de 500 m, então, a partir do zoom 8, entram
 * os polígonos do OpenStreetMap (mata, campo, lavoura, banhado) nas mesmas cores, com bordas nítidas.
 */
function addLandDetail(map: MlMap) {
  if (map.getLayer("detail-wood")) return;
  const source = Object.keys(map.getStyle().sources ?? {}).find((k) => k !== "overview" && map.getSource(k)?.type === "vector");
  if (!source) return;
  const before = map.getLayer("water") ? "water" : undefined;
  const fade = ["interpolate", ["linear"], ["zoom"], 8, 0, 10, 1] as unknown as number;
  const add = (id: string, layer: string, filter: unknown, color: string) =>
    map.addLayer(
      {
        id,
        type: "fill",
        source,
        "source-layer": layer,
        filter: filter as never,
        minzoom: 8,
        paint: { "fill-color": color, "fill-opacity": fade, "fill-antialias": false },
      },
      before,
    );
  add("detail-farmland", "landcover", ["==", ["get", "class"], "farmland"], "#e1f1d0");
  add("detail-grass", "landcover", ["==", ["get", "class"], "grass"], "#d6edc6");
  add("detail-wetland", "landcover", ["==", ["get", "class"], "wetland"], "#b2e0c2");
  add("detail-sand", "landcover", ["in", ["get", "class"], ["literal", ["sand", "rock"]]], "#f1f5ec");
  add("detail-wood", "landcover", ["==", ["get", "class"], "wood"], "#a6d89a");
  add("detail-residential", "landuse", ["in", ["get", "class"], ["literal", ["residential", "suburb", "neighbourhood", "commercial", "industrial", "retail"]]], "#e3e7dc");
}

/**
 * Reestiliza o Positron para o "atlas": oceano cinza-azulado, terra bege,
 * fronteiras estrangeiras discretas, rótulos em português e, na visão
 * nacional, sem estradas nem cidades pequenas (os parques são os protagonistas).
 */
function restyleBasemap(map: MlMap) {
  if (!map.getSource("overview")) {
    map.addSource("overview", overviewSource(window.location.origin));
    const first = map.getStyle().layers.find((l) => l.type !== "background")?.id;
    // Cobertura vegetal em verde, em todos os zooms (acima do 7 é ampliada); relevo e matas ficam por cima.
    map.addLayer(
      {
        id: "overview",
        type: "raster",
        source: "overview",
        paint: {
          "raster-opacity": 1,
          "raster-resampling": "linear",
          "raster-fade-duration": 200,
        },
      },
      first,
    );
  }
  addLandDetail(map);
  const set = (id: string, prop: string, value: unknown) => {
    try {
      map.setPaintProperty(id, prop as never, value as never);
    } catch {
      /* camada sem essa propriedade: ignora */
    }
  };
  for (const layer of map.getStyle().layers) {
    const { id, type } = layer;
    if (type === "background") set(id, "background-color", BASEMAP.land);
    else if (id === "water" && type === "fill") {
      set(id, "fill-color", BASEMAP.water);
      set(id, "fill-opacity", 1);
    }
    else if (id.startsWith("waterway") && type === "line") set(id, "line-color", BASEMAP.waterLine);
    else if (id !== "overview" && (id === "ne2_shaded" || type === "raster")) set(id, "raster-opacity", 0);
    else if (/^(park|landcover|landuse)/.test(id) && type === "fill") set(id, "fill-opacity", 0);
    else if (id.startsWith("boundary") && type === "line") {
      const national = /boundary_2|disputed/.test(id);
      set(id, "line-color", BASEMAP.foreignBorder);
      set(id, "line-opacity", national ? 0.85 : 0.4);
      set(id, "line-width", national ? ["interpolate", ["linear"], ["zoom"], 2, 0.6, 6, 1.1, 10, 1.6] : 0.5);
    }
    // Estradas, ferrovias e prédios só aparecem de perto.
    if (/highway|road|railway|tunnel|bridge|aeroway|building/.test(id)) map.setLayerZoomRange(id, 7, 24);
    if (type !== "symbol") continue;
    // Hierarquia de rótulos: na visão nacional, só países, capitais e água.
    if (/label_(village|other)/.test(id)) map.setLayerZoomRange(id, 9, 24);
    else if (/label_town/.test(id)) map.setLayerZoomRange(id, 7.5, 24);
    else if (/label_city$/.test(id)) map.setLayerZoomRange(id, 6, 24);
    else if (/label_city_capital/.test(id)) map.setLayerZoomRange(id, 4.5, 24);
    // Rótulos em português quando o OpenStreetMap tem name:pt.
    if (/shield|highway|road/.test(id)) continue;
    const field = map.getLayoutProperty(id, "text-field");
    if (field && JSON.stringify(field).includes("name")) {
      map.setLayoutProperty(id, "text-field", ["coalesce", ["get", "name:pt"], ["get", "name"]]);
      set(id, "text-color", "#4a4f55");
      set(id, "text-halo-color", "#ffffff");
      set(id, "text-halo-width", 1.5);
    }
  }
}
