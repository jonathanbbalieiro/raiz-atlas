import Image from "@/components/panel/PhotoImage";
import { Credit } from "@/components/panel/Gallery";
import { photoFrameAspect, photoObjectPosition } from "@/lib/photos";
import type { ExpeditionReference, PhotoCompareFeature } from "@/lib/data/types";

/** Edição comparativa: mantém ambas as imagens, as ressalvas e as fontes. */
export function PhotoCompare({feature,refs}:{feature:PhotoCompareFeature;refs:ExpeditionReference[]}) {
  const byId = new Map(refs.map(r=>[r.id,r]));
  return (
    <section aria-label={feature.title} className="mt-7 rounded-2xl border border-line bg-card p-4 md:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-earth">Observe as diferenças</p>
      <h3 className="mt-1 font-display text-xl font-semibold text-forest-deep">{feature.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{feature.intro}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {feature.items.map(item=>(
          <figure key={item.id} className="overflow-hidden rounded-xl border border-line bg-paper">
            <div className="relative bg-paper-deep" style={{ aspectRatio: photoFrameAspect(item.photo, "card") }}>
              <Image src={item.photo.src} alt={item.photo.alt} fill sizes="(min-width: 768px) 300px, 90vw" className="object-cover" style={{ objectPosition: photoObjectPosition(item.photo, "card") }} unoptimized={item.photo.src.includes("commons.wikimedia.org/wiki/Special:FilePath/") || item.photo.src.includes("www.gov.br/")}/>
            </div>
            <figcaption className="p-3">
              <strong className="block text-sm text-forest-deep">{item.title}</strong>
              <p className="mt-1 text-sm leading-relaxed text-ink">{item.description}</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">{item.photo.context}</p>
              <Credit photo={item.photo} className="mt-2 whitespace-normal"/>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.sourceIds.flatMap(id=>byId.get(id)||[]).map(r=><a key={r.id} href={r.url} rel="noopener noreferrer" className="text-xs text-forest underline underline-offset-2">{r.institution}</a>)}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
