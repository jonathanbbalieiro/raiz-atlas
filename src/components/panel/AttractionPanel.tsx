import Image from "@/components/panel/PhotoImage";
import { PanelHeader } from "@/components/nav/PanelHeader";
import { isVerified, TO_VERIFY, type Attraction, type PlaceSummary, type Verifiable } from "@/lib/data/types";
import { DIFFICULTY_LABEL, TAG_LABEL, TYPE_LABEL } from "@/lib/labels";
import { SITE } from "@/lib/site";
import { CoverButton, Credit, GalleryProvider, OpenGalleryButton, PhotoStrip } from "./Gallery";

/**
 * Detalhes de uma atração. No desktop aparece no painel lateral e no mobile
 * dentro do bottom sheet: é o mesmo componente, quem muda é a casca (ExploreShell).
 */
export function AttractionPanel({ attraction: a, trail }: { attraction: Attraction; trail: PlaceSummary[] }) {
  const pending = countPending(a);
  const hero = a.photos[0];
  const parkName = trail[2]?.name ?? "";

  return (
    <GalleryProvider photos={a.photos}>
      <article className="pb-6">
        <JsonLd attraction={a} />
        {hero ? (
          <>
            <div className="relative overflow-hidden md:rounded-t-2xl">
              <CoverButton label={`Ampliar foto de ${a.name}`}>
                <div className="relative aspect-[4/3] w-full bg-paper-deep">
                  <Image
                    src={hero.src}
                    alt={hero.alt}
                    fill
                    priority
                    sizes="(min-width: 768px) 420px, 100vw"
                    className="object-cover"
                  />
                </div>
              </CoverButton>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
              <div className="absolute inset-x-0 top-0">
                <PanelHeader trail={trail} overlay closable />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 px-5 pt-2">
              <Credit photo={hero} className="min-w-0" />
              <OpenGalleryButton />
            </div>
          </>
        ) : (
          <PanelHeader trail={trail} closable />
        )}

        <header className="px-5 pt-4">
          <p className="text-xs font-semibold tracking-wider text-water uppercase">{TYPE_LABEL[a.type]}</p>
          <h1 className="mt-1 font-display text-3xl leading-tight font-semibold text-forest-deep">
            {a.name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">{parkName}</p>
          <p className="mt-3 text-[15px] leading-relaxed">{a.shortDescription}</p>
        </header>

        {a.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 px-5 pt-3" aria-label="Características">
            {a.tags.map((t) => (
              <li key={t} className="rounded-full bg-moss/15 px-2.5 py-0.5 text-xs text-forest-deep">
                {TAG_LABEL[t]}
              </li>
            ))}
          </ul>
        )}

        <section aria-labelledby="info" className="mx-5 mt-5 rounded-xl border border-line bg-white/50 p-4">
          <h2 id="info" className="sr-only">
            Informações de visita
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Fact
              label="Dificuldade"
              value={a.access.difficulty}
              format={(v) => (v ? DIFFICULTY_LABEL[v] : "—")}
            />
            <Fact
              label="Trilha (ida)"
              value={a.access.trailDistanceKm}
              format={(v) => (v === null ? "Sem trilha" : `${fmt(v)} km`)}
            />
            {a.access.heightM !== undefined && (
              <Fact label="Altura" value={a.access.heightM} format={(v) => `${fmt(v)} m`} />
            )}
            <Fact label="Melhor época" value={a.bestSeason} />
            <Fact
              label="Guia"
              value={a.visiting.guideRequired}
              format={(v) => (v ? "Obrigatório" : "Não obrigatório")}
            />
            <Fact label="Ingresso" value={a.visiting.entranceFee} format={(v) => (v ? "Pago" : "Gratuito")} />
            <Fact label="Horário" value={a.visiting.openingHours} wide />
          </dl>
          {a.visiting.notes && (
            <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">{a.visiting.notes}</p>
          )}
        </section>

        {pending > 0 && (
          <p className="mx-5 mt-3 rounded-lg bg-sand/50 px-3 py-2 text-xs text-ink-soft" role="note">
            {pending === 1 ? "1 informação ainda está" : `${pending} informações ainda estão`} em verificação.
            Confirme regras e horários com o órgão gestor ou o atrativo antes de ir.
          </p>
        )}

        <section className="px-5 pt-6" aria-labelledby="sobre">
          <h2 id="sobre" className="font-display text-xl font-semibold text-forest-deep">
            Sobre
          </h2>
          <div className="mt-2 space-y-3 text-[15px] leading-relaxed">
            {a.longDescription.split(/\n\s*\n/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        <section className="px-5 pt-6" aria-labelledby="chegar">
          <h2 id="chegar" className="font-display text-xl font-semibold text-forest-deep">
            Como chegar
          </h2>
          <p className="mt-2 text-[15px]">
            Cidade-base: <strong>{a.howToGetThere.baseCity}</strong>
            {isVerified(a.howToGetThere.distanceFromBaseKm) &&
              ` · ${fmt(a.howToGetThere.distanceFromBaseKm)} km`}
          </p>
          {a.howToGetThere.directions && (
            <p className="mt-2 text-[15px] leading-relaxed">{a.howToGetThere.directions}</p>
          )}
          {isVerified(a.coordinates) && (
            <a
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-sm font-medium text-paper hover:bg-forest-deep"
              href={`https://www.openstreetmap.org/directions?to=${a.coordinates[1]}%2C${a.coordinates[0]}`}
              rel="noopener"
            >
              Traçar rota (OpenStreetMap)
            </a>
          )}
        </section>

        <PhotoStrip from={1} heading="Mais fotos" />

        {a.sources.length > 0 && (
          <section className="px-5 pt-6" aria-labelledby="fontes">
            <h2 id="fontes" className="text-xs font-semibold tracking-wider text-ink-soft uppercase">
              Fontes
            </h2>
            <ul className="mt-2 space-y-1 text-xs text-ink-soft">
              {a.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} rel="noopener" className="underline decoration-line hover:text-forest">
                    {s.title}
                  </a>{" "}
                  (acesso em {s.accessed.split("-").reverse().join("/")})
                </li>
              ))}
            </ul>
          </section>
        )}
      </article>
    </GalleryProvider>
  );
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

function Fact<T>({
  label,
  value,
  format = (v) => String(v),
  wide,
}: {
  label: string;
  value: Verifiable<T>;
  format?: (v: T) => string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-xs text-ink-soft">{label}</dt>
      <dd className="font-medium">
        {isVerified(value) ? (
          format(value)
        ) : (
          <span className="font-normal text-ink-soft italic">a verificar</span>
        )}
      </dd>
    </div>
  );
}

/** Quantos campos exibidos ainda estão "A_VERIFICAR". */
function countPending(a: Attraction) {
  const shown: unknown[] = [
    a.access.difficulty,
    a.access.trailDistanceKm,
    a.access.heightM,
    a.bestSeason,
    a.visiting.guideRequired,
    a.visiting.entranceFee,
    a.visiting.openingHours,
  ];
  return shown.filter((v) => v === TO_VERIFY).length;
}

/** Dados estruturados (schema.org) para buscadores. */
function JsonLd({ attraction: a }: { attraction: Attraction }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: a.name,
    description: a.shortDescription,
    url: `${SITE.url}/${a.path.join("/")}`,
    image: a.photos.map((p) => p.src),
    ...(isVerified(a.coordinates) && {
      geo: { "@type": "GeoCoordinates", latitude: a.coordinates[1], longitude: a.coordinates[0] },
    }),
    ...(isVerified(a.visiting.entranceFee) && { isAccessibleForFree: !a.visiting.entranceFee }),
  };
  return (
    <script
      type="application/ld+json"
      // `<` escapado para que nenhum texto de dados feche a tag <script>.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
