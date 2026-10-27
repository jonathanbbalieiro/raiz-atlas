import Image from "@/components/panel/PhotoImage";
import Link from "next/link";
import { JsonLd, breadcrumbs, parkData } from "@/components/seo/JsonLd";
import { PanelHeader } from "@/components/nav/PanelHeader";
import { ParkCards } from "@/components/nav/ParkCards";
import { Credit, GalleryProvider, OpenGalleryButton, PhotoStrip } from "@/components/panel/Gallery";
import { repo } from "@/lib/data";
import type { Park, PlaceSummary } from "@/lib/data/types";
import { EXPEDITION_SEGMENT } from "@/lib/editorial";
import { BIOME_COLOR, BIOME_LABEL, TYPE_LABEL, formatArea, href, joinPt, plural } from "@/lib/labels";
import { GuideBody, GuideOpening, GuideSources, guideSources } from "./ParkGuide";
import { ParkHero } from "./ParkHero";
import { ResearchNotes } from "./ResearchNotes";

/**
 * Estado C: ficha do parque. Layout editorial com hierarquia clara; só mostra
 * campos que existem na base (nada de campos vazios ou dados fictícios).
 */
export async function ParkView({
  park,
  trail,
  items,
}: {
  park: Park;
  trail: PlaceSummary[];
  items: PlaceSummary[];
}) {
  const [admin1, nearby] = await Promise.all([repo.listAdmin1(park.path[0]), repo.nearbyParks(park, 3)]);
  const states = park.ufs.map((u) => admin1.find((a) => a.code === u)?.name ?? u);
  const cover = park.photos[0];
  // "Parque Nacional da" + "Chapada dos Veadeiros": nome oficial completo, em dois níveis.
  const prefix = park.name.endsWith(park.shortName) ? park.name.slice(0, -park.shortName.length).trim() : "";

  const title = (onPhoto: boolean) => (
    <>
      <p
        className={`flex items-center gap-2 text-xs font-medium ${onPhoto ? "text-white/90" : "text-ink-soft"}`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ${onPhoto ? "ring-2 ring-white/70" : ""}`}
          style={{ background: BIOME_COLOR[park.biome] }}
        />
        {BIOME_LABEL[park.biome]} · {park.ufs.join(", ")}
      </p>
      <h1 className={`mt-1 font-display font-semibold text-balance ${onPhoto ? "" : "text-forest-deep"}`}>
        {prefix && <span className="block text-base leading-tight font-medium opacity-90">{prefix}</span>}
        <span className="block text-[32px] leading-[1.05]">{park.shortName}</span>
      </h1>
    </>
  );

  return (
    <GalleryProvider photos={park.photos}>
      <JsonLd data={parkData(park)} />
      <JsonLd data={breadcrumbs(trail)} />
      <article className="pb-4">
        {cover ? (
          <>
            <ParkHero
              slug={park.slug}
              photo={cover}
              label={`Ampliar foto de ${park.shortName}`}
              top={<PanelHeader trail={trail} overlay closable />}
            >
              {title(true)}
            </ParkHero>
            <div className="flex items-center justify-between gap-3 px-5 pt-2">
              <Credit photo={cover} className="min-w-0" />
              <OpenGalleryButton />
            </div>
          </>
        ) : (
          <>
            <PanelHeader trail={trail} closable />
            <div className="px-5 pt-1">{title(false)}</div>
          </>
        )}

        {park.guide ? (
          <GuideOpening guide={park.guide} sources={guideSources(park.guide)} />
        ) : (
          <div className="space-y-3 px-5 pt-5 text-[15px] leading-relaxed text-ink">
            <p>{park.shortDescription}</p>
            {park.longDescription?.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {park.expedition && (
          <Link
            href={href([...park.path, EXPEDITION_SEGMENT])}
            scroll={false}
            prefetch
            className="group mx-5 mt-5 block rounded-2xl bg-forest-deep p-5 text-card transition hover:bg-forest"
          >
            <span className="flex items-center justify-between gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase opacity-80">
              Raiz · Expedição
              {!park.expedition.approved && (
                <span className="rounded-full bg-card/15 px-2 py-0.5 tracking-normal normal-case">
                  Prévia em revisão
                </span>
              )}
            </span>
            <span className="mt-2 block font-display text-xl leading-snug font-semibold text-balance">
              {park.expedition.title}
            </span>
            <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium">
              Ler a expedição
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" className="transition group-hover:translate-x-0.5">
                <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </Link>
        )}

        <dl className="mx-5 mt-5 divide-y divide-line rounded-xl border border-line bg-card text-sm">
          <Row label={states.length > 1 ? "Estados" : "Estado"} value={joinPt(states)} />
          <Row
            label={park.biomes.length > 1 ? "Biomas" : "Bioma"}
            value={joinPt(park.biomes.map((b) => BIOME_LABEL[b]))}
          />
          <Row label="Área" value={formatArea(park.areaHa)} />
          {park.createdYear && <Row label="Criação" value={String(park.createdYear)} />}
          <Row
            label="Localização"
            value={formatCoords(park.labelPoint)}
            hint="Ponto de referência no interior do parque"
          />
        </dl>

        <GuideBody guide={park.guide} bio={park.biodiversity} lost={park.lostWorld} parkName={park.shortName} />

        {park.research && <ResearchNotes research={park.research} />}

        {items.length > 0 && (
          <section className="px-4 pt-7" aria-label="Atrações">
            <h2 className="px-1 font-display text-xl font-semibold text-forest-deep">
              {plural(items.length, "atração", "atrações")}
            </h2>
            <ul className="stagger mt-2 space-y-1">
              {items.map((a, i) => (
                <li key={a.path.join("/")} style={{ "--i": i } as React.CSSProperties}>
                  <Link
                    href={href(a.path)}
                    scroll={false}
                    prefetch
                    className="group flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-card"
                  >
                    <span className="relative h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-paper-deep">
                      {a.photo && (
                        <Image src={a.photo.src} alt="" fill sizes="64px" className="object-cover" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{a.name}</span>
                      {a.type && <span className="text-xs text-ink-soft">{TYPE_LABEL[a.type]}</span>}
                    </span>
                    <svg
                      viewBox="0 0 16 16"
                      width="12"
                      height="12"
                      aria-hidden="true"
                      className="mr-1.5 text-ink-soft"
                    >
                      <path
                        d="M6 3l5 5-5 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <PhotoStrip from={1} heading="Mais fotos" />

        <ParkCards items={nearby} heading="Parques próximos" filterable={false} />

        <footer className="mt-6 space-y-1.5 border-t border-line px-5 pt-4 text-xs text-ink-soft">
          {park.creationAct && <p>Atos de criação: {park.creationAct}</p>}
          <p>Código CNUC: {park.cnuc}</p>
          {park.guide && <GuideSources guide={park.guide} />}
          <ul className="space-y-1">
            {park.sources.map((s) => (
              <li key={s.url}>
                Fonte:{" "}
                <a
                  href={s.url}
                  rel="noopener"
                  className="underline decoration-line underline-offset-2 hover:text-forest"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </footer>
      </article>
    </GalleryProvider>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="shrink-0 text-ink-soft">{label}</dt>
      <dd className="text-right font-medium text-ink" title={hint}>
        {value}
      </dd>
    </div>
  );
}

/** [-47.36, -13.94] → "13,94° S · 47,36° O" */
function formatCoords([lng, lat]: [number, number]) {
  const f = (v: number) =>
    Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${f(lat)}° ${lat < 0 ? "S" : "N"} · ${f(lng)}° ${lng < 0 ? "O" : "L"}`;
}
