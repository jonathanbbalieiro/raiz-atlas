"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Faixa horizontal com setas laterais para quem usa mouse ou teclado. As
 * setas só aparecem quando há mais conteúdo naquela direção e ficam ocultas
 * em telas de toque, onde o arraste já basta. Um único componente para todas
 * as faixas do site (maravilhas, curiosidades, espécies, destaques).
 */
export function Carousel({
  as: Tag = "ul",
  className = "",
  label,
  children,
  ...rest
}: {
  as?: "ul" | "ol" | "div";
  /** Classes da faixa rolável (espaçamento, ajuste de margens...). */
  className?: string;
  /** Nome acessível do grupo; as setas dizem "Anterior" e "Próximo" a partir dele. */
  label: string;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  const scroller = useRef<HTMLElement>(null);
  const [edge, setEdge] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const start = el.scrollLeft < 8;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    setEdge((cur) => (cur.start === start && cur.end === end ? cur : { start, end }));
  }, []);

  // O observador dispara ao conectar e a cada mudança de tamanho (painel alargado, rotação...).
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => ro.disconnect();
  }, [measure]);

  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(":scope > :not([aria-hidden='true'])");
    const cardStep = (card?.clientWidth ?? el.clientWidth * 0.7) + 12;
    // Avança uma "página": todos os cartões que cabem inteiros na faixa visível (pelo menos um).
    const step = Math.max(1, Math.floor(el.clientWidth / cardStep)) * cardStep;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="relative">
      <Tag
        ref={scroller as never}
        onScroll={measure}
        aria-label={label}
        className={`no-scrollbar flex overflow-x-auto ${className}`}
        {...rest}
      >
        {children}
      </Tag>
      {!edge.start && <Arrow dir={-1} onClick={() => page(-1)} label={`${label}: anterior`} />}
      {!edge.end && <Arrow dir={1} onClick={() => page(1)} label={`${label}: próximo`} />}
    </div>
  );
}

function Arrow({ dir, onClick, label }: { dir: 1 | -1; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={dir < 0 ? "Anterior" : "Próximo"}
      className={`surface absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-ink transition hover:bg-paper-deep pointer-coarse:hidden ${
        dir < 0 ? "left-1" : "right-1"
      }`}
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          d={dir < 0 ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
