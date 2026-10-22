"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ViewTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ExploreProvider, useExplore } from "@/components/map/focus";
import { MapView } from "@/components/map/MapView";
import type { MapIndex } from "@/lib/data/types";
import { EXPEDITION_SEGMENT } from "@/lib/editorial";
import { SITE } from "@/lib/site";
import { BiomeFilter } from "./BiomeFilter";
import { SearchBox } from "./SearchBox";
import { SurpriseButton } from "./SurpriseButton";

const DESKTOP_QUERY = "(min-width: 768px)";
const GAP = 16;

/** Alturas do bottom sheet (fração da janela) no celular: recolhido, parcial, expandido. */
const SNAPS = { peek: 0.24, half: 0.56, full: 0.92 } as const;
type Snap = keyof typeof SNAPS;
const SNAP_LABEL: Record<Snap, string> = {
  peek: "recolhido",
  half: "parcialmente aberto",
  full: "expandido",
};
/**
 * Na visão do Brasil o mapa é o protagonista; em estado/parque o conteúdo sobe.
 * Na Expedição a leitura é o protagonista: o sheet abre inteiro.
 */
const isReading = (pathname: string) => pathname.endsWith(`/${EXPEDITION_SEGMENT}`);
const snapFor = (pathname: string): Snap =>
  isReading(pathname) ? "full" : pathname.split("/").filter(Boolean).length >= 2 ? "half" : "peek";

/**
 * Casca persistente: mapa em tela cheia, barra superior, filtros, controles e
 * painel. Fica no layout, então o mapa nunca é desmontado; só o conteúdo do
 * painel muda entre níveis.
 */
export function ExploreShell({ index, children }: { index: MapIndex; children: ReactNode }) {
  return (
    <ExploreProvider index={index}>
      <Shell>{children}</Shell>
    </ExploreProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLElement>(null);
  const [snap, setSnap] = useState<Snap>(() => snapFor(pathname));
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const { panelOpen, setPanelOpen } = useExplore();

  // Ao trocar de nível o sheet se ajusta e o painel reabre (estado derivado,
  // ajustado no render para que o enquadramento do mapa já use a área nova).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setSnap(snapFor(pathname));
    if (!panelOpen) setPanelOpen(true);
  }

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  const live = useRef({ snap, panelOpen });
  // Atualizado antes dos efeitos de foco do mapa, que leem a área livre.
  useLayoutEffect(() => {
    live.current = { snap, panelOpen };
  });
  /** Área ocupada por painel, barra superior e filtros: o mapa enquadra no espaço restante. */
  const getPadding = useCallback(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      const panelW = live.current.panelOpen ? (panelRef.current?.offsetWidth ?? 400) + GAP * 2 : 64;
      // A barra de biomas fica embaixo à esquerda: o mapa enquadra acima dela.
      const filters = document.querySelector<HTMLElement>("[data-biome-filter]");
      const bottom = filters && filters.offsetHeight ? filters.offsetHeight + GAP * 2 : 40;
      return { top: 100, bottom, left: 40, right: panelW + 24 };
    }
    const safeTop =
      Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat")) || 0;
    return {
      top: safeTop + 132,
      left: 20,
      right: 64,
      bottom: window.innerHeight * SNAPS[live.current.snap] + 16,
    };
  }, []);

  /* Arraste do bottom sheet pela alça (com toque ou mouse). */
  const justDragged = useRef(false);
  const onPointerDown = (e: React.PointerEvent) =>
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  const onPointerMove = (e: React.PointerEvent) => {
    if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return;
    setDragHeight(Math.min(Math.max(window.innerHeight - e.clientY, 96), window.innerHeight * SNAPS.full));
  };
  const onPointerUp = () => {
    if (dragHeight === null) return;
    justDragged.current = true;
    const frac = dragHeight / window.innerHeight;
    setSnap(
      (Object.keys(SNAPS) as Snap[]).reduce((a, b) =>
        Math.abs(SNAPS[b] - frac) < Math.abs(SNAPS[a] - frac) ? b : a,
      ),
    );
    setDragHeight(null);
  };
  const sheetHeight = dragHeight !== null ? `${dragHeight}px` : `${SNAPS[snap] * 100}dvh`;

  return (
    <div
      className="shell fixed inset-0 overflow-hidden"
      data-panel={panelOpen ? "open" : "closed"}
      data-reading={isReading(pathname) ? "" : undefined}
    >
      <a
        href="#conteudo"
        className="sr-only z-70 rounded-lg bg-forest px-3 py-2 text-card focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>

      <MapView getPadding={getPadding} />

      {/* Barra superior unificada: marca, busca e descoberta. */}
      <header className="pointer-events-none absolute top-[calc(var(--sat)+12px)] right-3 left-3 z-40 md:top-4 md:right-[calc(var(--panel-offset)+16px)] md:left-4 md:transition-[right] md:duration-200">
        <div className="surface pointer-events-auto relative flex h-14 max-w-[760px] items-center gap-1 rounded-2xl pr-1.5 pl-2">
          <Link
            href="/"
            scroll={false}
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl px-2 font-display text-[17px] font-semibold tracking-tight text-forest-deep hover:bg-paper-deep"
          >
            <Logo />
            <span className="hidden lg:inline">
              {SITE.name.toLowerCase()}
              <span className="text-earth">.</span>
            </span>
            <span className="sr-only lg:hidden">{SITE.name}: início</span>
          </Link>
          <span aria-hidden="true" className="mx-1 h-7 w-px shrink-0 bg-line" />
          <SearchBox />
          <SurpriseButton />
        </div>
      </header>

      <BiomeFilter />

      {/* Desktop/tablet: aba presa à borda esquerda do painel, para recolhê-lo. */}
      {panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(false)}
          aria-label="Recolher painel"
          title="Recolher painel"
          className="absolute top-1/2 right-[calc(var(--panel-w)+16px)] z-30 hidden h-14 w-6 -translate-y-1/2 items-center justify-center rounded-l-lg bg-paper text-ink-soft shadow-sm hover:bg-paper-deep hover:text-ink md:flex"
        >
          <Chevron dir="right" />
        </button>
      )}

      {/* Desktop/tablet: botão para reabrir o painel recolhido. */}
      {!panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="surface absolute top-4 right-4 z-30 hidden h-14 items-center gap-2 rounded-2xl px-4 text-sm font-medium text-forest-deep hover:bg-paper-deep md:flex"
          style={{ animation: "pop-in 180ms ease-out" }}
        >
          <Chevron dir="left" />
          Mostrar painel
        </button>
      )}

      <aside
        ref={panelRef}
        id="conteudo"
        tabIndex={-1}
        aria-label="Painel de exploração"
        inert={!panelOpen ? true : undefined}
        style={{ "--sheet-h": sheetHeight } as React.CSSProperties}
        className={[
          // overflow-x-hidden: só as faixas de fotos rolam na horizontal, nunca o painel inteiro.
          "panel absolute z-30 overflow-x-hidden overflow-y-auto overscroll-contain",
          // Celular: bottom sheet com área segura no rodapé.
          "inset-x-0 bottom-0 h-(--sheet-h) rounded-t-[22px] pb-[env(safe-area-inset-bottom)]",
          dragHeight === null ? "transition-[height] duration-300 ease-out" : "",
          // Desktop/tablet: cartão à direita com largura fluida; recolhível.
          "md:top-4 md:right-4 md:bottom-4 md:left-auto md:h-auto md:w-(--panel-w) md:rounded-2xl md:pb-0",
          "md:transition-transform md:duration-250 md:ease-out",
          panelOpen ? "md:translate-x-0" : "md:translate-x-[calc(100%+24px)]",
        ].join(" ")}
      >
        {/* Alça do bottom sheet (celular). */}
        <div
          className="sticky top-0 z-20 flex cursor-grab touch-none justify-center bg-paper/95 pt-2 pb-1.5 md:hidden"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <button
            type="button"
            aria-label={`Painel ${SNAP_LABEL[snap]}. Toque para ${snap === "full" ? "recolher" : "expandir"}.`}
            className="flex h-6 w-20 items-center justify-center"
            onClick={() => {
              // Toque/teclado sem arrastar: alterna entre os três tamanhos.
              if (justDragged.current) {
                justDragged.current = false;
                return;
              }
              setSnap((s) => (s === "peek" ? "half" : s === "half" ? "full" : "peek"));
            }}
          >
            <span className="h-1.5 w-11 rounded-full bg-ink/20" />
          </button>
        </div>

        {/* Só o conteúdo do painel participa da transição; o mapa segue vivo. */}
        <ViewTransition key={pathname} enter="panel-in" exit="panel-out" default="none">
          <div>{children}</div>
        </ViewTransition>
        <p className="px-5 pt-4 pb-6 text-[11px] leading-relaxed text-ink-soft">
          Mapa: OpenFreeMap · © OpenMapTiles · © colaboradores do OpenStreetMap. Relevo: Terrain Tiles
          (Mapzen/AWS). Limites e parques: IBGE e ICMBio.
        </p>
      </aside>
    </div>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d={dir === "left" ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Símbolo do Raiz: linha de serra e um curso d’água sinuoso. */
function Logo() {
  return (
    <svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true" fill="none">
      <path
        d="M5 27.5 15.5 14 23.8 24.5 29.4 18 43 32"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M13 36.8c6.5-5 14.8-6.1 22-10.7M15 42c9-6 17-6 25-9.5"
        stroke="var(--water)"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="35" cy="11.5" r="3.5" fill="#c7902f" />
    </svg>
  );
}
