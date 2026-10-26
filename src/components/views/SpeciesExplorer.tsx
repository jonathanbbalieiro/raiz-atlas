"use client";

import { useState } from "react";
import { Carousel } from "@/components/panel/Carousel";
import { speciesObjectPosition } from "@/lib/photo-frame";
import type { Biodiversity, IucnCategory, SpeciesCard } from "@/lib/data/types";

export const IUCN_LABEL: Partial<Record<IucnCategory, string>> = {
  CR: "Criticamente em perigo",
  EN: "Em perigo",
  VU: "Vulnerável",
  NT: "Quase ameaçada",
  DD: "Dados insuficientes",
  EW: "Extinta na natureza",
  EX: "Extinta",
};
const IUCN_TONE: Partial<Record<IucnCategory, string>> = {
  CR: "bg-[#9b2c1f] text-white",
  EN: "bg-[#c2522d] text-white",
  VU: "bg-[#d99a2b] text-ink",
  NT: "bg-paper-deep text-ink",
  DD: "bg-paper-deep text-ink-soft",
};

/** Miniatura do Commons em largura padrão (500 px), servida direto pelo Wikimedia. */
const thumb = (src: string) =>
  src.replace(/\/(\d+)px-([^/]+)$/, (m, w, f) => (Number(w) > 500 ? `/500px-${f}` : m));

const GAUGE: { cat: IucnCategory; label: string; color: string }[] = [
  { cat: "CR", label: "Criticamente em perigo", color: "#9b2c1f" },
  { cat: "EN", label: "Em perigo", color: "#c2522d" },
  { cat: "VU", label: "Vulnerável", color: "#d99a2b" },
  { cat: "NT", label: "Quase ameaçada", color: "#b8b08a" },
  { cat: "LC", label: "Pouco preocupante", color: "#5f8f5a" },
];

type Flagship = { scientificName: string; name: string; why: string; card: SpeciesCard | null };

/**
 * "Quem vive aqui": espécies-símbolo (escolha editorial) e abas por grupo com
 * as espécies mais documentadas dentro do limite do parque, mais uma aba de
 * ameaçadas. As espécies-símbolo vêm no HTML; as abas mostram um grupo por vez.
 */
export function SpeciesExplorer({ bio, flagships }: { bio: Biodiversity; flagships: Flagship[] }) {
  const tabs = [
    ...(bio.threatened.length ? [{ id: "ameacadas", label: "Ameaçadas", species: bio.threatened }] : []),
    ...bio.groups.map((g) => ({ id: g.id, label: g.label, species: g.species })),
  ];
  const [active, setActive] = useState(tabs.find((t) => t.id === "mamiferos")?.id ?? tabs[0]?.id);
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  const [cat, setCat] = useState<IucnCategory | null>(null);
  const everyone = [...new Map([...bio.threatened, ...bio.groups.flatMap((g) => g.species)].map((x) => [x.gbifKey, x])).values()];
  const counts = GAUGE.map((g) => ({ ...g, n: everyone.filter((x) => x.iucn === g.cat).length }));
  const showGauge = counts.some((c) => c.cat !== "LC" && c.n > 0);
  const filtered = cat ? everyone.filter((x) => x.iucn === cat) : null;

  return (
    <div>
      {flagships.length > 0 && (
        <Carousel
          label="Espécies-símbolo"
          className="-mx-5 mt-4 snap-x snap-mandatory scroll-px-5 gap-3 px-5 pb-1"
        >
          {flagships.map((f) => (
            <li
              key={f.scientificName}
              className="w-60 shrink-0 snap-start overflow-hidden rounded-2xl bg-forest-deep text-card"
            >
              {f.card?.photo && (
                <div className="relative aspect-[4/3] bg-forest">
                  {
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura padrão do Commons, sem reprocessar
                    <img
                      src={thumb(f.card.photo.src)}
                      alt={f.card.photo.alt}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      style={{ objectPosition: speciesObjectPosition(f.card.photo) }}
                    />
                  }
                  {f.card?.iucn && IUCN_LABEL[f.card.iucn] && f.card.iucn !== "DD" && (
                    <span
                      className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${IUCN_TONE[f.card.iucn]}`}
                    >
                      {IUCN_LABEL[f.card.iucn]}
                    </span>
                  )}
                </div>
              )}
              <div className="p-3.5">
                <p className="font-display text-lg leading-tight font-semibold">{f.name}</p>
                <p className="text-xs italic opacity-75">{f.scientificName}</p>
                <p className="mt-2 text-[13px] leading-relaxed opacity-90">{f.why}</p>
                {f.card?.photo && <PhotoCredit photo={f.card.photo} dark />}
              </div>
            </li>
          ))}
        </Carousel>
      )}

      {showGauge && (
        <div className="mt-5 rounded-2xl border border-line bg-card p-3.5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">Termômetro da vida</p>
          <p className="mt-0.5 text-[13px] text-ink-soft">
            Toque numa faixa para ver as espécies de cada situação na lista de IUCN.
          </p>
          <div role="group" aria-label="Situação de conservação" className="mt-2.5 flex h-9 gap-0.5 overflow-hidden rounded-full">
            {counts
              .filter((c) => c.n > 0)
              .map((c) => (
                <button
                  key={c.cat}
                  type="button"
                  aria-pressed={cat === c.cat}
                  title={`${c.label}: ${c.n}`}
                  onClick={() => setCat(cat === c.cat ? null : c.cat)}
                  style={{ flexGrow: c.n, background: c.color, opacity: cat && cat !== c.cat ? 0.35 : 1 }}
                  className="min-w-9 text-[12px] font-semibold text-white transition-opacity first:rounded-l-full last:rounded-r-full"
                >
                  {c.n}
                </button>
              ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-soft">
            {counts
              .filter((c) => c.n > 0)
              .map((c) => (
                <li key={c.cat} className="flex items-center gap-1">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  {c.label}
                </li>
              ))}
          </ul>
          {filtered && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[13px] text-ink">
                <span>
                  {filtered.length} {filtered.length === 1 ? "espécie" : "espécies"}: {GAUGE.find((g) => g.cat === cat)!.label.toLowerCase()}
                </span>
                <button type="button" onClick={() => setCat(null)} className="text-[12px] text-ink-soft underline underline-offset-2">
                  Limpar
                </button>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-2.5">
                {filtered.map((x) => (
                  <SpeciesTile key={x.gbifKey} s={x} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {tabs.length > 0 && current && (
        <>
          <Carousel as="div" role="tablist" label="Grupos de espécies" className="-mx-5 mt-5 gap-1.5 px-5">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === current.id}
                onClick={() => setActive(t.id)}
                className={[
                  "h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition",
                  t.id === current.id
                    ? "border-forest bg-forest text-card"
                    : "border-line bg-card text-ink hover:border-forest/40",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </Carousel>
          <ul role="tabpanel" aria-label={current.label} className="mt-3 grid grid-cols-2 gap-2.5">
            {current.species.map((s) => (
              <SpeciesTile key={s.gbifKey} s={s} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SpeciesTile({ s }: { s: SpeciesCard }) {
  return (
    <li className="overflow-hidden rounded-xl border border-line bg-card">
                <div className="relative aspect-[4/3] bg-paper-deep">
                  {s.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniatura padrão do Commons, sem reprocessar
                    <img
                      src={thumb(s.photo.src)}
                      alt={s.photo.alt}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      style={{ objectPosition: speciesObjectPosition(s.photo) }}
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center px-3 text-center text-xs text-ink-soft">
                      Sem foto com licença livre
                    </span>
                  )}
                  {s.iucn && IUCN_TONE[s.iucn] && s.iucn !== "DD" && (
                    <span
                      className={`absolute top-1.5 left-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${IUCN_TONE[s.iucn]}`}
                      title={IUCN_LABEL[s.iucn]}
                    >
                      {s.iucn === "NT" ? "Quase ameaçada" : IUCN_LABEL[s.iucn]}
                    </span>
                  )}
                </div>
                <div className="px-2.5 pt-2 pb-2.5">
                  <p className="text-[13px] leading-tight font-semibold text-ink">
                    {s.name ?? <i>{s.scientificName}</i>}
                  </p>
                  {s.name && (
                    <p className="mt-0.5 truncate text-[11px] text-ink-soft italic">{s.scientificName}</p>
                  )}
                  {s.photo && <PhotoCredit photo={s.photo} />}
                </div>
              </li>
  );
}

function PhotoCredit({ photo, dark = false }: { photo: NonNullable<SpeciesCard["photo"]>; dark?: boolean }) {
  return (
    <p
      className={`mt-1.5 truncate text-[10px] ${dark ? "opacity-60" : "text-ink-soft"}`}
      title={`Foto: ${photo.author} · ${photo.license}`}
    >
      <a href={photo.sourceUrl} rel="noopener" className="hover:underline">
        {photo.author}
      </a>{" "}
      ·{" "}
      <a href={photo.licenseUrl} rel="license noopener" className="hover:underline">
        {photo.license}
      </a>
    </p>
  );
}
