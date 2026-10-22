import Image from "next/image";
import { Carousel } from "@/components/panel/Carousel";
import { Credit } from "@/components/panel/Gallery";
import type { Biodiversity, GuideSource, LostWorld as LostWorldData, ParkGuide as Guide } from "@/lib/data/types";
import { LostWorld } from "./LostWorld";
import { ParkQuiz } from "./ParkQuiz";
import { SpeciesExplorer } from "./SpeciesExplorer";
import { BiodiversityGallery } from "./BiodiversityGallery";
import { photoFrameAspect, photoObjectPosition } from "@/lib/photos";

/*
 * Guia do parque: o conteúdo que encanta, em blocos curtos e visuais.
 *   O que ele protege → Maravilhas naturais → Quem vive aqui → Você sabia? → Histórias
 * Cada bloco só aparece se houver conteúdo; cada afirmação aponta para fonte.
 * "Quem vive aqui" existe para todos os parques (levantamento automático),
 * mesmo antes de o guia editorial ser escrito.
 */

const EMPTY_BIO: Biodiversity = {
  generatedAt: "",
  boundary: "",
  method: "",
  sources: [],
  groups: [],
  threatened: [],
};

const Kicker = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">{children}</p>
);
const H2 = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2
    id={id}
    className="mt-1 font-display text-[22px] leading-tight font-semibold text-balance text-forest-deep"
  >
    {children}
  </h2>
);

function Cite({ ids, sources }: { ids: string[]; sources: Map<string, GuideSource> }) {
  const list = ids.flatMap((id) => sources.get(id) ?? []);
  if (!list.length) return null;
  return (
    <span className="ml-1 text-[11px] whitespace-nowrap text-ink-soft">
      {list.map((s, i) => (
        <a
          key={s.id}
          href={s.url}
          rel="noopener"
          title={`${s.institution}: ${s.title}`}
          className="underline decoration-line underline-offset-2 hover:text-forest"
        >
          {i > 0 ? ", " : "["}
          {s.institution}
          {i === list.length - 1 ? "]" : ""}
        </a>
      ))}
    </span>
  );
}

/** Frase de encanto + abertura, logo abaixo da capa. */
export function GuideOpening({ guide, sources }: { guide: Guide; sources: Map<string, GuideSource> }) {
  return (
    <div className="px-5 pt-5">
      <p className="font-display text-[21px] leading-snug font-medium text-balance text-forest-deep italic">
        {guide.hook}
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-ink">
        {guide.intro}
        <Cite ids={guide.sourceIds} sources={sources} />
      </p>
    </div>
  );
}

export function GuideBody({
  guide,
  bio,
  lost,
  parkName,
}: {
  guide?: Guide;
  bio?: Biodiversity;
  lost?: LostWorldData;
  parkName: string;
}) {
  const sources = new Map((guide?.sources ?? []).map((s) => [s.id, s]));
  const flagships = (guide?.flagships ?? []).map((f) => ({
    ...f,
    card:
      [...(bio?.groups.flatMap((g) => g.species) ?? []), ...(bio?.threatened ?? [])].find(
        (s) => s.scientificName.toLowerCase() === f.scientificName.toLowerCase() && s.photo,
      ) ??
      (f.photo
        ? {
            gbifKey: 0,
            scientificName: f.scientificName,
            name: f.name,
            family: null,
            records: null,
            iucn: null,
            wikidata: null,
            photo: f.photo,
          }
        : null),
  }));

  return (
    <>
      {guide && guide.protects.items.length > 0 && (
        <section aria-labelledby="protege" className="px-5 pt-8">
          <Kicker>O que ele protege</Kicker>
          <H2 id="protege">{guide.protects.summary}</H2>
          <ul className="mt-3 space-y-2">
            {guide.protects.items.map((it) => (
              <li key={it.title} className="rounded-xl border border-line bg-card px-4 py-3">
                <p className="font-semibold text-ink">{it.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink">
                  {it.text}
                  <Cite ids={it.sourceIds} sources={sources} />
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {guide && guide.wonders.length > 0 && (
        <section aria-labelledby="maravilhas" className="pt-8">
          <div className="px-5">
            <Kicker>Maravilhas naturais</Kicker>
            <H2 id="maravilhas">O que faz parar e olhar</H2>
          </div>
          <Carousel
            label="Maravilhas naturais"
            className="mt-3 snap-x snap-mandatory scroll-px-5 gap-3 px-5 pb-1"
          >
            {guide.wonders.map((w) => (
              <li
                key={w.title}
                className="w-[78%] max-w-72 shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-card"
              >
                {w.photo && (
                  <div className="relative bg-paper-deep" style={{ aspectRatio: photoFrameAspect(w.photo, "card") }}>
                    <Image src={w.photo.src} alt={w.photo.alt} fill sizes="288px" className="object-cover" style={{ objectPosition: photoObjectPosition(w.photo, "card") }} />
                  </div>
                )}
                <div className="p-4">
                  <p className="font-display text-lg leading-tight font-semibold text-forest-deep">
                    {w.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink">
                    {w.text}
                    <Cite ids={w.sourceIds} sources={sources} />
                  </p>
                  {w.photo && <Credit photo={w.photo} className="mt-2" />}
                </div>
              </li>
            ))}
            <li aria-hidden="true" className="w-2 shrink-0" />
          </Carousel>
        </section>
      )}

      {(flagships.length > 0 || (bio && bio.groups.length > 0)) && (
        <section aria-labelledby="quem-vive" className="px-5 pt-8">
          <Kicker>Quem vive aqui</Kicker>
          <H2 id="quem-vive">Fauna e flora do parque</H2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            Espécies com registros científicos dentro do limite do parque. As primeiras são as mais
            documentadas, não necessariamente as mais fáceis de ver.
          </p>
          <SpeciesExplorer bio={bio ?? EMPTY_BIO} flagships={flagships} />
          {bio && (
            <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
              Levantamento automático ({bio.boundary}): {bio.method} Fontes:{" "}
              {bio.sources.map((s, i) => (
                <span key={s.url}>
                  {i > 0 && " · "}
                  <a
                    href={s.url}
                    rel="noopener"
                    className="underline decoration-line underline-offset-2 hover:text-forest"
                  >
                    {s.title}
                  </a>
                </span>
              ))}
              .
            </p>
          )}
        </section>
      )}


      {bio && <BiodiversityGallery bio={bio} />}

      {bio && <ParkQuiz bio={bio} parkName={parkName} />}

      {lost && lost.items.length > 0 && <LostWorld lost={lost} />}

      {guide && guide.curiosities.length > 0 && (
        <section aria-labelledby="voce-sabia" className="pt-8">
          <div className="px-5">
            <Kicker>Você sabia?</Kicker>
            <H2 id="voce-sabia">Curiosidades</H2>
          </div>
          <Carousel
            as="ol"
            label="Curiosidades"
            className="mt-3 snap-x snap-mandatory scroll-px-5 gap-3 px-5 pb-1"
          >
            {guide.curiosities.map((c, i) => (
              <li
                key={i}
                className={`w-[72%] max-w-64 shrink-0 snap-start rounded-2xl p-4 ${
                  [
                    "bg-forest-deep text-card",
                    "bg-water text-white",
                    "bg-earth text-white",
                    "bg-moss text-ink",
                  ][i % 4]
                }`}
              >
                <p className="font-display text-3xl leading-none font-semibold opacity-60">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed">{c.text}</p>
                <p className="mt-2 text-[11px] opacity-75">
                  {c.sourceIds
                    .flatMap((id) => sources.get(id) ?? [])
                    .map((s, k) => (
                      <a key={s.id} href={s.url} rel="noopener" className="underline underline-offset-2">
                        {k > 0 && ", "}
                        {s.institution}
                      </a>
                    ))}
                </p>
              </li>
            ))}
            <li aria-hidden="true" className="w-2 shrink-0" />
          </Carousel>
        </section>
      )}

      {guide && guide.stories.length > 0 && (
        <section aria-labelledby="historias" className="px-5 pt-8">
          <Kicker>Histórias</Kicker>
          <H2 id="historias">Gente, tempo e território</H2>
          <ol className="mt-3 space-y-4 border-l-2 border-line pl-4">
            {guide.stories.map((s) => (
              <li key={s.title} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute top-1.5 -left-[23px] h-3 w-3 rounded-full border-2 border-paper bg-earth"
                />
                <p className="font-semibold text-ink">{s.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink">
                  {s.text}
                  <Cite ids={s.sourceIds} sources={sources} />
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

/** Fontes do guia, no rodapé da ficha. */
export function GuideSources({ guide }: { guide: Guide }) {
  return (
    <>
      {guide.status === "rascunho" && (
        <p className="text-earth">Guia em revisão editorial: visível só em prévia.</p>
      )}
      <ul className="space-y-1">
        {guide.sources.map((s) => (
          <li key={s.id}>
            Guia:{" "}
            <a
              href={s.url}
              rel="noopener"
              className="underline decoration-line underline-offset-2 hover:text-forest"
            >
              {s.institution}, {s.title}
            </a>{" "}
            (consulta em {s.accessed.split("-").reverse().join("/")})
          </li>
        ))}
      </ul>
    </>
  );
}

export const guideSources = (guide?: Guide) => new Map((guide?.sources ?? []).map((s) => [s.id, s]));
