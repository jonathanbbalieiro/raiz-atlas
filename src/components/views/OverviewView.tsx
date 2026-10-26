import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { JsonLd, websiteData } from "@/components/seo/JsonLd";
import { ViewTransition } from "react";
import { StateList } from "@/components/nav/StateList";
import { Carousel } from "@/components/panel/Carousel";
import { repo } from "@/lib/data";
import type { Country } from "@/lib/data/types";
import { BIOME_COLOR, BIOME_LABEL, formatArea, href } from "@/lib/labels";
import { BiomeBar } from "./BiomeBar";

/** Destaques "para se inspirar" (só a escolha é editorial; os dados vêm da base). */
const FEATURED = ["lencois-maranhenses", "fernando-de-noronha", "chapada-dos-veadeiros", "serra-da-capivara"];

/**
 * Estado A: visão geral do Brasil. Números derivados da base (nada fixo no
 * componente), lista de estados e alguns destaques para começar.
 */
export async function OverviewView({ country }: { country: Country }) {
  const parks = await repo.listParks(country.slug);
  const ufs = new Set(parks.flatMap((p) => p.ufs)).size;
  const area = parks.reduce((n, p) => n + p.areaHa, 0);
  const oldest = parks.filter((p) => p.createdYear).sort((a, b) => a.createdYear! - b.createdYear!)[0];
  const featured = FEATURED.map((s) => parks.find((p) => p.slug === s)).filter((p) => p !== undefined);

  return (
    <>
      <JsonLd data={websiteData()} />
      <div className="px-5 pt-2 md:pt-6">
        <p className="text-xs font-semibold tracking-[0.12em] text-earth uppercase">{country.name}</p>
        <h1 className="mt-1.5 font-display text-[32px] leading-[1.08] font-semibold text-forest-deep text-balance">
          Explore os parques nacionais
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
          Do Monte Roraima ao Albardão, cada parque guarda uma paisagem única. Escolha um estado, use os
          filtros de bioma ou toque num parque no mapa para conhecê-lo.
        </p>

        <dl className="mt-5 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-card">
          <Stat value={String(parks.length)} label="parques nacionais" strong />
          <Stat value={String(ufs)} label="unidades da federação" />
          <Stat value={formatArea(area, { short: true })} label="protegidos" />
        </dl>
        {oldest && (
          <p className="mt-2 text-xs text-ink-soft">
            O mais antigo é {oldest.shortName}, criado em {oldest.createdYear}.
          </p>
        )}
        <BiomeBar biomes={parks.map((p) => p.biome)} />
      </div>

      <StateList />

      {featured.length > 0 && (
        <section className="pt-7" aria-labelledby="inspirar-titulo">
          <h2 id="inspirar-titulo" className="px-5 font-display text-xl font-semibold text-forest-deep">
            Para se inspirar
          </h2>
          <Carousel
            label="Para se inspirar"
            className="mt-3 snap-x snap-mandatory scroll-px-5 gap-3 px-5 pb-1"
          >
            {featured.map((p) => (
              <li key={p.slug} className="w-44 shrink-0 snap-start">
                <Link href={href(p.path)} scroll={false} prefetch className="group block">
                  <ViewTransition name={`park-photo-${p.slug}`} share="morph" default="none">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-paper-deep">
                      {p.photos[0] && (
                        <Image
                          src={p.photos[0].src}
                          alt=""
                          fill
                          sizes="176px"
                          className="object-cover transition duration-500 group-hover:scale-[1.04]"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                        <p className="flex items-center gap-1.5 text-[11px] font-medium">
                          <span
                            className="h-2 w-2 rounded-full ring-1 ring-white/70"
                            style={{ background: BIOME_COLOR[p.biome] }}
                          />
                          {BIOME_LABEL[p.biome]}
                        </p>
                        <p className="font-display text-lg leading-tight font-semibold">{p.shortName}</p>
                      </div>
                    </div>
                  </ViewTransition>
                </Link>
              </li>
            ))}
            <li aria-hidden="true" className="w-2 shrink-0" />
          </Carousel>
        </section>
      )}
      <p className="px-5 pt-8 pb-6 text-center text-xs leading-relaxed text-ink-soft">
        <Link href="/sobre" className="underline underline-offset-2 hover:text-forest">
          Sobre e créditos
        </Link>
        {" · "}
        <a href={`mailto:${SITE.contact}`} className="underline underline-offset-2 hover:text-forest">
          {SITE.contact}
        </a>
      </p>
    </>
  );
}

function Stat({ value, label, strong = false }: { value: string; label: string; strong?: boolean }) {
  return (
    <div className="px-3 py-3">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span
          className={`block font-display leading-none font-semibold text-forest-deep ${strong ? "text-[28px]" : "text-[22px]"}`}
        >
          {value}
        </span>
        <span className="mt-1 block text-[11px] leading-tight text-ink-soft">{label}</span>
      </dd>
    </div>
  );
}
