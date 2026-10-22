"use client";

import { useState } from "react";
import type { ExpeditionReference, TimelineFeature } from "@/lib/data/types";

/**
 * Linha do tempo: a única interação especial de uma Expedição. Só marcos
 * documentados, cada um com sua fonte; não representa limites históricos.
 * Todos os marcos ficam no HTML (para leitura sem JavaScript e indexação);
 * os botões só escolhem qual é destacado.
 */
export function Timeline({ feature, refs }: { feature: TimelineFeature; refs: ExpeditionReference[] }) {
  const [selected, setSelected] = useState(0);
  const byId = new Map(refs.map((r) => [r.id, r]));

  return (
    <section aria-label={feature.title} className="mt-6 rounded-2xl border border-line bg-card p-4">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">Linha do tempo</p>
      <h3 className="mt-1 font-display text-xl font-semibold text-forest-deep">{feature.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{feature.intro}</p>

      <div role="group" aria-label="Escolha um marco" className="relative mt-4 flex gap-2">
        <span aria-hidden="true" className="absolute inset-x-2 top-1/2 h-px bg-line" />
        {feature.items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
            className={[
              "relative h-10 flex-1 rounded-full border font-display text-base font-semibold tabular-nums transition",
              selected === i
                ? "border-forest bg-forest text-card"
                : "border-line bg-paper text-forest-deep hover:border-forest/50",
            ].join(" ")}
          >
            {item.year}
          </button>
        ))}
      </div>

      <ol className="mt-4" aria-live="polite">
        {feature.items.map((item, i) => (
          <li key={item.id} hidden={selected !== i}>
            <p className="font-display text-sm text-ink-soft">{item.year}</p>
            <p className="font-semibold text-ink">{item.title}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink">{item.description}</p>
            <p className="mt-2 text-xs text-ink-soft">
              Fonte:{" "}
              {item.sourceIds.map((id, k) => {
                const r = byId.get(id);
                return r ? (
                  <span key={id}>
                    {k > 0 && " · "}
                    <a href={r.url} rel="noopener" className="underline decoration-line underline-offset-2 hover:text-forest">
                      {r.institution}
                    </a>
                  </span>
                ) : null;
              })}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
