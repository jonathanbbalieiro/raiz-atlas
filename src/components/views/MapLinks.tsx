"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useExplore } from "@/components/map/focus";

/**
 * Ligações entre o painel (renderizado no servidor) e o mapa. O conteúdo
 * continua inteiro no painel; o mapa é um complemento, nunca o único caminho.
 */

/** Cartão de maravilha: realça e rola até ficar visível quando escolhido no mapa. */
export function WonderCard({ index, className, children }: { index: number; className: string; children: ReactNode }) {
  const { activeWonder } = useExplore();
  const ref = useRef<HTMLLIElement>(null);
  const active = activeWonder?.index === index;
  useEffect(() => {
    if (!active || activeWonder?.from !== "map") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ref.current?.scrollIntoView({ behavior: reduce ? "instant" : "smooth", block: "nearest", inline: "center" });
  }, [active, activeWonder]);
  return (
    <li ref={ref} data-active={active || undefined}
      className={`${className} transition-shadow data-[active]:border-forest data-[active]:shadow-[0_0_0_2px_var(--color-forest)]`}>
      {children}
    </li>
  );
}

/** "Ver no mapa": o mapa voa até a maravilha; no celular, a gaveta baixa para mostrá-lo. */
export function WonderMapButton({ index, number, title, approximate }: { index: number; number: number; title: string; approximate: boolean }) {
  const { activeWonder, setActiveWonder, requestMapView } = useExplore();
  const active = activeWonder?.index === index;
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <button type="button" aria-pressed={active}
        onClick={() => { setActiveWonder({ index, from: "panel" }); requestMapView(); }}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest/30 px-3 text-sm font-semibold whitespace-nowrap text-forest hover:bg-moss/15 aria-pressed:bg-forest aria-pressed:text-card">
        <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-current text-xs">{number}</span>
        Ver no mapa<span className="sr-only">: {title}{approximate && ", localização aproximada"}</span>
      </button>
      {approximate && <span aria-hidden="true" className="text-xs text-ink-soft">localização aproximada</span>}
    </p>
  );
}

/** Realça o entorno no mapa e enquadra parque e vizinhos; um segundo toque volta ao parque. */
export function ContextMapButton({ label }: { label: string }) {
  const { storyPlace, setStoryPlace, requestMapView } = useExplore();
  const on = !!storyPlace && "frame" in storyPlace;
  return (
    <button type="button" aria-pressed={on}
      onClick={() => {
        setStoryPlace(on ? null : { label, frame: "entorno" });
        if (!on) requestMapView();
      }}
      className="mt-4 inline-flex min-h-11 items-center rounded-full border border-forest/30 px-4 text-sm font-semibold text-forest hover:bg-moss/15 aria-pressed:bg-forest aria-pressed:text-card">
      {on ? "Voltar ao parque no mapa" : "Mostrar o entorno no mapa"}
    </button>
  );
}
