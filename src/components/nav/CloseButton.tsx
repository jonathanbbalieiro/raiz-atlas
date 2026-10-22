"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useExplore } from "@/components/map/focus";

/**
 * Fecha o parque/atração e volta para onde o usuário estava explorando (a
 * visão geral ou o estado de onde veio). Sem histórico (link direto), volta
 * para o nível pai. Esc faz o mesmo, exceto quando a busca ou o visualizador
 * de fotos estão abertos (eles tratam o Esc antes).
 */
export function CloseButton({
  fallback,
  label,
  tone = "light",
}: {
  fallback: string;
  label: string;
  tone?: "light" | "overlay";
}) {
  const { lastContextPath } = useExplore();
  const pathname = usePathname();
  const router = useRouter();
  const target = lastContextPath && lastContextPath !== pathname ? lastContextPath : fallback;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [role='dialog']")) return;
      router.push(target, { scroll: false });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, target]);

  return (
    <button
      type="button"
      onClick={() => router.push(target, { scroll: false })}
      aria-label={label}
      title={`${label} (Esc)`}
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition pointer-coarse:h-11 pointer-coarse:w-11",
        tone === "overlay"
          ? "bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
          : "border border-line bg-card text-ink hover:bg-paper-deep",
      ].join(" ")}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </button>
  );
}
