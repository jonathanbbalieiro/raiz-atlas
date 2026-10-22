"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { useExplore } from "@/components/map/focus";
import { href, plural } from "@/lib/labels";

/**
 * "Surpreenda-me": sorteia um parque real da base, respeitando o filtro de
 * biomas (o rótulo acessível diz entre quantos). O dado gira a cada clique e
 * o botão mostra que está carregando até a ficha abrir.
 */
export function SurpriseButton() {
  const { index, focus, biomes, visibleParks } = useExplore();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [spin, setSpin] = useState(0);

  const pool = visibleParks.filter((p) => p.slug !== focus?.path[2]);
  const label = biomes
    ? `Surpreenda-me: sorteia um entre ${plural(pool.length, "parque", "parques")} do filtro atual`
    : "Surpreenda-me: sorteia um parque nacional";

  /*
   * O sorteio é feito antes do clique (ao passar o mouse ou focar o botão) e a
   * página sorteada é pré-carregada: no clique a ficha abre sem espera.
   * Se o filtro mudou nesse meio-tempo, sorteia de novo dentro do filtro atual.
   */
  const next = useRef<string | null>(null);
  const pick = () => {
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (!p) return null;
    const url = href([index.country, p.admin1, p.slug]);
    next.current = url;
    router.prefetch(url);
    return url;
  };
  const stillValid = (url: string) => pool.some((p) => url.endsWith(`/${p.admin1}/${p.slug}`));
  const prepare = () => {
    if (!next.current || !stillValid(next.current)) pick();
  };

  const go = () => {
    const url = next.current && stillValid(next.current) ? next.current : pick();
    if (!url) return;
    next.current = null;
    setSpin((n) => n + 1);
    startTransition(() => router.push(url, { scroll: false }));
  };

  return (
    <button
      type="button"
      onClick={go}
      onPointerEnter={prepare}
      onFocus={prepare}
      onTouchStart={prepare}
      disabled={!pool.length}
      aria-label={label}
      title={label}
      aria-busy={pending}
      className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-forest px-3 text-sm font-medium text-card transition hover:bg-forest-deep active:scale-[0.97] disabled:opacity-50 md:px-3.5"
    >
      <svg
        key={spin}
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        style={spin ? { animation: "spin-once 450ms cubic-bezier(.2,.8,.2,1)" } : undefined}
      >
        <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
        <circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" />
        <circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" />
        <circle cx="12" cy="12" r="1.3" fill="currentColor" />
      </svg>
      <span className="hidden xl:inline" aria-hidden="true">
        {pending ? "Sorteando…" : "Surpreenda-me"}
      </span>
    </button>
  );
}
