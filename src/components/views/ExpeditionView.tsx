import Image from "next/image";
import Link from "next/link";
import { Credit, GalleryProvider, PhotoOpen } from "@/components/panel/Gallery";
import type {
  ContextPhoto,
  Expedition,
  ExpeditionMoment,
  ExpeditionReference,
  Park,
  PlaceSummary,
} from "@/lib/data/types";
import { BIOME_COLOR, BIOME_LABEL, href } from "@/lib/labels";
import { ReadingProgress } from "./ReadingProgress";
import { Timeline } from "./Timeline";

type Refs = Map<string, ExpeditionReference>;
type Cite = { sourceId: string; locator: string }[];
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Expedição: a reportagem longa de um parque, renderizada no servidor (HTML
 * estático e indexável). Ocupa o painel alargado; o mapa segue ao lado,
 * enquadrado no parque. Um único componente para qualquer parque: o conteúdo
 * vem de data/<país>/parks/<parque>/expedition.json.
 */
export function ExpeditionView({
  park,
  expedition: e,
  trail,
}: {
  park: Park;
  expedition: Expedition;
  trail: PlaceSummary[];
}) {
  const refs: Refs = new Map(e.references.map((r) => [r.id, r]));
  const parkHref = href(park.path);
  const total = e.moments.length;
  const photos = [e.cover, ...e.moments.flatMap((m) => m.images)].filter((p): p is ContextPhoto => !!p);
  const at = (p: ContextPhoto) => photos.findIndex((x) => x.src === p.src);

  return (
    <GalleryProvider photos={photos}>
    <article className="pb-6" aria-labelledby="expedicao-titulo">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur-sm max-md:top-[34px]">
        <Link
          href={parkHref}
          scroll={false}
          prefetch
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card pr-4 pl-3 text-sm font-medium text-ink transition hover:bg-paper-deep"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {trail.at(-1)?.name ?? park.shortName}
        </Link>
        <ReadingProgress moments={e.moments.map((m) => ({ id: m.id, title: m.title }))} />
      </div>

      {!e.approved && (
        <p role="note" className="mx-5 mt-4 rounded-xl border border-earth/30 bg-earth/8 px-4 py-3 text-sm text-ink">
          <strong className="font-semibold">Prévia em revisão.</strong> Este texto ainda não foi aprovado
          editorialmente ({e.status.replaceAll("_", " ")}) e não é publicado no site de produção.
        </p>
      )}

      <header id="abertura" className="scroll-mt-16 px-5 pt-6 md:px-8">
        <p className="flex items-center gap-2 text-xs font-medium text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: BIOME_COLOR[park.biome] }} />
          {park.name} · {park.ufs.join(" / ")} · {BIOME_LABEL[park.biome]}
        </p>
        <h1
          id="expedicao-titulo"
          className="mt-3 font-display text-[34px] leading-[1.06] font-semibold text-balance text-forest-deep md:text-[42px]"
        >
          {e.title}
        </h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">{e.subtitle}</p>
        <div className="mt-6 h-px w-16 bg-earth" />
        <p className="mt-6 font-display text-xl leading-snug font-medium text-balance text-forest-deep">
          {e.centralQuestion}
        </p>
        <Prose paragraphs={e.introduction} />
      </header>

      {e.keyFacts && e.keyFacts.length > 0 && (
        <section aria-labelledby="em-numeros" className="mx-5 mt-6 md:mx-8">
          <h2 id="em-numeros" className="text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">
            Em números
          </h2>
          <dl className="mt-2 grid grid-cols-2 gap-2">
            {e.keyFacts.map((k) => {
              const r = refs.get(k.sourceId);
              return (
                <div key={k.label} className="rounded-xl border border-line bg-card px-3.5 py-3">
                  <dd className="font-display text-xl leading-tight font-semibold text-forest-deep">{k.value}</dd>
                  <dt className="mt-0.5 text-[13px] leading-snug text-ink">{k.label}</dt>
                  {r && (
                    <p className="mt-1 text-[11px] text-ink-soft">
                      <a href={r.url} rel="noopener" className="underline decoration-line underline-offset-2 hover:text-forest">
                        {r.institution}
                      </a>
                      {k.locator ? `, ${k.locator}` : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </dl>
        </section>
      )}

      <nav aria-label="Neste caderno de campo" className="mx-5 mt-6 rounded-xl border border-line bg-card p-4 md:mx-8">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">Caderno de campo</p>
        <ol className="mt-2 space-y-1">
          {e.moments.map((m, i) => (
            <li key={m.id}>
              <a
                href={`#${m.id}`}
                className="flex gap-3 rounded-lg px-2 py-1.5 text-sm text-ink transition hover:bg-paper-deep"
              >
                <span className="w-6 shrink-0 font-display text-ink-soft tabular-nums">{pad(i + 1)}</span>
                {m.title}
              </a>
            </li>
          ))}
          <li>
            <a href="#fontes" className="flex gap-3 rounded-lg px-2 py-1.5 text-sm text-ink transition hover:bg-paper-deep">
              <span className="w-6 shrink-0" />
              Fontes e créditos
            </a>
          </li>
        </ol>
      </nav>

      {e.cover && <Figure photo={e.cover} index={0} priority />}

      {e.moments.map((m, i) => (
        <Moment key={m.id} moment={m} label={`${pad(i + 1)} / ${pad(total)}`} refs={refs} indexOf={at}>
          {e.feature?.momentId === m.id && <Timeline feature={e.feature} refs={e.references} />}
        </Moment>
      ))}

      {e.glossary && e.glossary.length > 0 && (
        <section aria-labelledby="glossario" className="mt-10 px-5 md:px-8">
          <h2 id="glossario" className="font-display text-xl font-semibold text-forest-deep">
            Pequeno glossário
          </h2>
          <dl className="mt-3 space-y-3">
            {e.glossary.map((g) => (
              <div key={g.term}>
                <dt className="font-medium text-ink">{g.term}</dt>
                <dd className="text-sm leading-relaxed text-ink-soft">
                  {g.definition}
                  {refs.get(g.sourceId) && (
                    <>
                      {" "}
                      <a href={refs.get(g.sourceId)!.url} rel="noopener" className="underline decoration-line underline-offset-2 hover:text-forest">
                        [{refs.get(g.sourceId)!.institution}]
                      </a>
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <footer id="fontes" className="mt-10 scroll-mt-16 border-t border-line px-5 pt-8 md:px-8">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">Por que isso importa</p>
        <h2 className="mt-2 font-display text-2xl leading-tight font-semibold text-balance text-forest-deep">
          {e.closingTitle}
        </h2>
        <p className="mt-3 text-[17px] leading-relaxed text-ink">{e.closing}</p>
        <Link
          href={parkHref}
          scroll={false}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-medium text-card transition hover:bg-forest-deep"
        >
          Voltar ao parque no mapa
        </Link>

        <h3 className="mt-8 font-display text-lg font-semibold text-forest-deep">Pesquisa e fontes</h3>
        <ul className="mt-3 space-y-2">
          {e.references.map((r) => (
            <li key={r.id}>
              <a
                href={r.url}
                rel="noopener"
                className="block rounded-xl border border-line bg-card px-4 py-3 transition hover:border-forest/40"
              >
                <span className="block text-sm font-medium text-ink">
                  {r.institution} · {r.title}
                </span>
                <span className="mt-0.5 block text-xs text-ink-soft">
                  Consultado em {formatDate(r.accessedAt)}. Usado para: {r.use}.
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          Texto editorial próprio, fundamentado nas fontes acima; não são citações. Autoria e licença de
          cada fotografia aparecem junto dela. Última verificação: {formatDate(e.lastVerifiedAt)}.
        </p>
      </footer>
    </article>
    </GalleryProvider>
  );
}

function Moment({
  moment: m,
  label,
  refs,
  indexOf,
  children,
}: {
  moment: ExpeditionMoment;
  label: string;
  refs: Refs;
  indexOf: (p: ContextPhoto) => number;
  children?: React.ReactNode;
}) {
  return (
    <section id={m.id} aria-labelledby={`${m.id}-titulo`} className="mt-10 scroll-mt-16">
      <div className="px-5 md:px-8">
        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">{m.eyebrow}</p>
          <p className="font-display text-sm text-ink-soft tabular-nums">{label}</p>
        </div>
        <h2
          id={`${m.id}-titulo`}
          className="mt-3 font-display text-[28px] leading-[1.1] font-semibold text-balance text-forest-deep"
        >
          {m.title}
        </h2>
        <p className="mt-2 font-display text-lg leading-snug text-ink-soft italic">{m.question}</p>
        <Prose paragraphs={m.paragraphs} />
      </div>
      {m.images.map((img) => (
        <Figure key={img.src} photo={img} index={indexOf(img)} />
      ))}
      <div className="px-5 md:px-8">
        {m.note && (
          <aside className="mt-5 rounded-xl border-l-4 border-water bg-card px-4 py-3">
            <p className="text-sm font-semibold text-ink">{m.note.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{m.note.body}</p>
          </aside>
        )}
        {children}
        <Evidence ids={m.sourceIds} refs={refs} cites={m.citations} />
      </div>
    </section>
  );
}

function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="mt-4 max-w-[64ch] space-y-4 text-[17px] leading-[1.7] text-ink">
      {paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function Figure({ photo, index, priority = false }: { photo: ContextPhoto; index: number; priority?: boolean }) {
  return (
    <figure className="mt-6">
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-paper-deep md:mx-8 md:w-[calc(100%-4rem)] md:rounded-xl">
        <PhotoOpen index={index} label={`Ampliar: ${photo.alt}`}>
          <Image quality={90}
            src={photo.src}
            alt={photo.alt}
            fill
            priority={priority}
            sizes="(min-width: 768px) 680px, 100vw"
            className="object-cover"
          />
        </PhotoOpen>
      </div>
      <figcaption className="px-5 pt-2 md:px-8">
        <span className="block text-sm leading-snug text-ink">{photo.context}</span>
        <Credit photo={photo} className="mt-0.5 whitespace-normal" />
      </figcaption>
    </figure>
  );
}

function Evidence({ ids, refs, cites }: { ids: string[]; refs: Refs; cites?: Cite }) {
  const sources = [...new Set(ids)].flatMap((id) => refs.get(id) ?? []);
  if (!sources.length) return null;
  const where = (id: string) => cites?.filter((c) => c.sourceId === id).map((c) => c.locator).join("; ");
  return (
    <p className="mt-5 text-xs text-ink-soft">
      Pesquisa:{" "}
      {sources.map((r, i) => (
        <span key={r.id}>
          {i > 0 && " · "}
          <a href={r.url} rel="noopener" className="underline decoration-line underline-offset-2 hover:text-forest">
            {r.institution}: {r.title}
          </a>
          {where(r.id) ? `, ${where(r.id)}` : ""}
        </span>
      ))}
    </p>
  );
}

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
