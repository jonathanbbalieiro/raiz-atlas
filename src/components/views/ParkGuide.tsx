import Image from "@/components/panel/PhotoImage";
import Link from "next/link";
import { Carousel } from "@/components/panel/Carousel";
import { Credit } from "@/components/panel/Gallery";
import type { Biodiversity, GuideSource, LostWorld as LostWorldData, ParkGuide as Guide } from "@/lib/data/types";
import { LostWorld } from "./LostWorld";
import { ParkQuiz } from "./ParkQuiz";
import { SpeciesExplorer } from "./SpeciesExplorer";
import { resolveFlagshipCard } from "@/lib/species-photos";

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
  exploreHref,
}: {
  guide?: Guide;
  bio?: Biodiversity;
  lost?: LostWorldData;
  parkName: string;
  exploreHref?: string;
}) {
  const sources = new Map((guide?.sources ?? []).map((s) => [s.id, s]));
  const selectedSpecies = [...new Map([
    ...(bio?.groups.flatMap((group) => group.species) ?? []), ...(bio?.threatened ?? []),
  ].map((species) => [species.gbifKey, species])).values()];
  const threatenedCount = selectedSpecies.filter((species) => species.iucn && ["CR", "EN", "VU"].includes(species.iucn)).length;
  const flagships = (guide?.flagships ?? []).map((f) => ({
    ...f,
    sources: f.sourceIds.flatMap((id) => sources.get(id) ?? []),
    card: resolveFlagshipCard(f, bio),
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
                  <div className="relative aspect-[4/3] bg-paper-deep">
                    <Image quality={90} src={w.photo.src} alt={w.photo.alt} fill sizes="288px" className="object-contain" />
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
                  {w.photo && <>
                    <p className="mt-2 text-xs leading-relaxed text-ink-soft">{w.photo.context}</p>
                    <Credit photo={w.photo} className="mt-2" />
                  </>}
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
            Os destaques editoriais explicam a relação de cada espécie com este território e indicam suas fontes.
            Nas abas, o levantamento de ocorrências complementa essa seleção; registros não medem abundância ou facilidade de avistamento.
          </p>
          {bio && selectedSpecies.length > 0 && <p className="mt-3 text-sm leading-relaxed text-ink">
            O levantamento apresentado reúne {selectedSpecies.length} espécies em {bio.groups.length} grupos.
            {threatenedCount > 0 && <> Destas, {threatenedCount} têm classificação global de ameaça (vulnerável, em perigo ou criticamente em perigo) na base consultada.</>}
            {" "}Essa contagem descreve apenas a seleção abaixo, não o total de espécies de {parkName}.
            {bio.sources[0] && <> <a href={bio.sources[0].url} target="_blank" rel="noopener noreferrer" className="underline decoration-line underline-offset-2">Consultar levantamento e ocorrências</a>.</>}
          </p>}
          <details className="mt-3 rounded-xl border border-line bg-card p-3 text-sm text-ink-soft">
            <summary className="cursor-pointer font-semibold text-forest-deep">Por que estas espécies?</summary>
            <p className="mt-2 leading-relaxed">Os destaques vêm do guia editorial: sua justificativa e a fonte devem explicar o vínculo com o parque. Uma espécie pode representar mais de um parque; ela não precisa ser exclusiva para ser importante à conservação daquele território. Destaque editorial não significa símbolo oficial.</p>
            <p className="mt-2 leading-relaxed">{bio?.selectionPolicy === "records-first"
              ? "As abas priorizam o número de registros por grupo, independentemente de haver fotografia."
              : "Este levantamento histórico selecionou candidatos por grupo, priorizando fotos e nomes populares e, dentro dessas faixas, o número de registros."}
              {" "}A aba de ameaçadas usa a categoria de conservação. A cobertura varia entre grupos e regiões e não é um inventário completo. A ausência de uma espécie nesta lista não prova sua ausência no parque.</p>
            <p className="mt-2 leading-relaxed">Uma fotografia ilustra a espécie identificada e pode ter sido feita em outro lugar. O registro de ocorrência e a fonte editorial, e não a foto, sustentam a ligação com o parque.</p>
          </details>
          {exploreHref && <Link href={exploreHref} scroll={false}
            className="mt-5 flex min-h-12 items-center justify-between gap-3 rounded-xl border border-forest/30 bg-card px-4 py-3 text-sm font-semibold text-forest hover:bg-moss/15">
            Explorar fauna e flora em detalhes <span aria-hidden="true">↗</span>
          </Link>}
          <SpeciesExplorer bio={bio ?? EMPTY_BIO} flagships={flagships} />
          {bio?.boundary.includes("envoltória") && <p className="mt-3 rounded-xl border border-line p-3 text-xs leading-relaxed text-ink-soft">
            Este levantamento usou uma envoltória aproximada do parque, que pode incluir áreas do entorno. Consulte as fontes de ocorrência antes de afirmar presença dentro do limite oficial.
          </p>}
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
