"use client";

import { useMemo, useState } from "react";
import type { SpeciesCard } from "@/lib/data/types";
import { photoFrameAspect, photoObjectPosition } from "@/lib/photos";

/** Acrescenta uma vitrine botânica à interface original, sem substituir o explorador nem o quiz. */
export function FloraHighlight({ species }: { species: SpeciesCard[] }) {
  const [expanded, setExpanded] = useState(false);
  const ordered = useMemo(() => [...species].sort((a, b) =>
    Number(Boolean(b.photo)) - Number(Boolean(a.photo)) || (b.records ?? 0) - (a.records ?? 0)
  ), [species]);
  if (!ordered.length) return null;
  const selected = expanded ? ordered : ordered.slice(0, 8);
  return (
    <section aria-labelledby="flora-vitrine-title" className="mt-6 rounded-2xl border border-line bg-card p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-earth">Flora em destaque</p>
      <h3 id="flora-vitrine-title" className="mt-1 font-display text-xl font-semibold text-forest-deep">Plantas que fazem parte desta paisagem</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        Uma seleção de plantas registradas na base científica para este parque. A ordem reflete a qualidade da documentação fotográfica e o volume de registros, não abundância, facilidade de avistamento ou status de símbolo oficial.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {selected.map((plant) => (
          <article key={plant.gbifKey} className="overflow-hidden rounded-xl border border-line bg-paper">
            <div className="relative overflow-hidden bg-paper-deep" style={{ aspectRatio: plant.photo ? photoFrameAspect(plant.photo, "card") : "4 / 3" }}>
              {plant.photo ? (
                <a className="block h-full w-full" href={plant.photo.sourceUrl} target="_blank" rel="noopener noreferrer" title="Abrir página original da fotografia">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Miniaturas do Commons com crédito junto da obra */}
                  <img src={plant.photo.src} alt={plant.photo.alt || plant.scientificName} loading="lazy" className="h-full w-full object-cover" style={{ objectPosition: photoObjectPosition(plant.photo, "card") }} />
                </a>
              ) : <div className="flex h-full items-center justify-center p-2 text-center text-xs text-ink-soft">Fotografia não disponível</div>}
            </div>
            <div className="px-3 py-3">
              <p className="font-display text-[16px] leading-tight font-semibold text-forest-deep">{plant.name || plant.scientificName}</p>
              {plant.name && <p className="mt-1 text-[11px] italic text-ink-soft">{plant.scientificName}</p>}
              {plant.family && <p className="mt-1 text-[11px] text-ink-soft">Família {plant.family}</p>}
              {plant.records !== null && <p className="mt-1 text-[11px] text-ink-soft">{plant.records} registros na base</p>}
              {plant.photo && <p className="mt-1 text-[10px] leading-relaxed text-ink-soft">
                Foto: <a href={plant.photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">{plant.photo.author}</a> · {" "}
                <a href={plant.photo.licenseUrl} target="_blank" rel="license noopener noreferrer" className="underline">{plant.photo.license}</a>
              </p>}
            </div>
          </article>
        ))}
      </div>
      {ordered.length > 8 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}
        className="mt-3 w-full rounded-full border border-forest/30 px-4 py-2.5 text-sm font-semibold text-forest hover:bg-moss/20">
        {expanded ? "Mostrar seleção menor" : `Ver mais plantas desta seleção (${ordered.length})`}
      </button>}
      <p className="mt-3 text-xs text-ink-soft">Para outras espécies, consulte as abas de grupos abaixo ou o{" "}
        <a href="https://catalogo-ucs-brasil.jbrj.gov.br/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Catálogo de Plantas das Unidades de Conservação</a>.
      </p>
    </section>
  );
}
