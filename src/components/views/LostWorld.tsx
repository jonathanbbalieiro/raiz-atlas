"use client";

import Image from "@/components/panel/PhotoImage";
import { useState } from "react";
import { Credit } from "@/components/panel/Gallery";
import type { GuideSource, LostKind, LostSpecies, LostWorld as Lost } from "@/lib/data/types";

const KIND: Record<LostKind, { label: string; tone: string }> = {
  extinta: { label: "Extinta", tone: "bg-[#5a2a22] text-white" },
  extinta_na_natureza: { label: "Extinta na natureza", tone: "bg-[#8a3b2b] text-white" },
  possivelmente_extinta: { label: "Possivelmente extinta", tone: "bg-[#a85d2e] text-white" },
  extinta_localmente: { label: "Extinta no local", tone: "bg-[#c2522d] text-white" },
  megafauna_fossil: { label: "Megafauna fóssil", tone: "bg-earth text-white" },
  reintroduzida: { label: "Voltou", tone: "bg-forest text-white" },
};

/**
 * "Mundo perdido": o que já viveu aqui e não vive mais (ou voltou). Filtro por
 * tipo; todas as fichas ficam no HTML e o filtro só esconde as demais.
 */
export function LostWorld({ lost }: { lost: Lost }) {
  const sources = new Map(lost.sources.map((s) => [s.id, s]));
  const kinds = [...new Set(lost.items.map((i) => i.kind))];
  const [filter, setFilter] = useState<LostKind | "todas">("todas");

  return (
    <section aria-labelledby="mundo-perdido" className="px-5 pt-8">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">Mundo perdido</p>
      <h2
        id="mundo-perdido"
        className="mt-1 font-display text-[22px] leading-tight font-semibold text-balance text-forest-deep"
      >
        Quem já viveu aqui
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{lost.intro}</p>

      {kinds.length > 1 && (
        <div role="group" aria-label="Filtrar por tipo" className="mt-3 flex flex-wrap gap-1.5">
          {(["todas", ...kinds] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
              className={[
                "h-9 rounded-full border px-3.5 text-[13px] font-medium transition",
                filter === k ? "border-forest bg-forest text-card" : "border-line bg-card text-ink hover:border-forest/40",
              ].join(" ")}
            >
              {k === "todas" ? "Todas" : KIND[k].label}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-3 space-y-3">
        {lost.items.map((item) => (
          <Item key={item.scientificName} item={item} sources={sources} hidden={filter !== "todas" && item.kind !== filter} />
        ))}
      </ul>
    </section>
  );
}

function Item({ item, sources, hidden }: { item: LostSpecies; sources: Map<string, GuideSource>; hidden: boolean }) {
  const k = KIND[item.kind];
  const list = item.sourceIds.flatMap((id) => sources.get(id) ?? []);
  return (
    <li hidden={hidden} className="overflow-hidden rounded-2xl border border-line bg-card">
      {item.photo && (
        <figure>
          <div className="relative aspect-[3/2] bg-paper-deep">
            <Image quality={90}
              src={item.photo.src}
              alt={item.photo.alt}
              fill
              sizes="(min-width: 768px) 480px, 100vw"
              className="object-cover sepia-[25%]"
            />
            <span className={`absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${k.tone}`}>
              {k.label}
            </span>
          </div>
          <figcaption className="px-4 pt-2 text-[12px] leading-snug text-ink-soft">
            {item.photo.context}
            <Credit photo={item.photo} className="mt-0.5 whitespace-normal" />
          </figcaption>
        </figure>
      )}
      <div className="px-4 py-3.5">
        {!item.photo && (
          <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${k.tone}`}>{k.label}</span>
        )}
        <p className="mt-1.5 font-display text-lg leading-tight font-semibold text-forest-deep">{item.name}</p>
        <p className="text-xs text-ink-soft">
          <i>{item.scientificName}</i> · {item.when}
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-ink">{item.text}</p>
        {list.length > 0 && (
          <p className="mt-2 text-[11px] text-ink-soft">
            {list.map((s, i) => (
              <span key={s.id}>
                {i > 0 && " · "}
                <a
                  href={s.url}
                  rel="noopener"
                  title={s.title}
                  className="underline decoration-line underline-offset-2 hover:text-forest"
                >
                  {s.institution}
                </a>
              </span>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}
