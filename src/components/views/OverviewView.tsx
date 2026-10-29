import Image from "@/components/panel/PhotoImage";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { JsonLd, websiteData } from "@/components/seo/JsonLd";
import { ViewTransition } from "react";
import { BiomeExplorer } from "@/components/home/BiomeExplorer";
import { HomePanel, TabLink } from "@/components/home/HomePanel";
import { StatesTab } from "@/components/home/StatesTab";
import { Carousel } from "@/components/panel/Carousel";
import { SurpriseButton } from "@/components/shell/SurpriseButton";
import { repo } from "@/lib/data";
import type { Country, Park } from "@/lib/data/types";
import { EXPEDITION_SEGMENT } from "@/lib/editorial";
import { SOURCES } from "@/lib/about";
import { BIOME_COLOR, BIOME_LABEL, formatArea, href } from "@/lib/labels";

/** Destaques "para se inspirar" (só a escolha é editorial; os dados vêm da base). */
const FEATURED = ["lencois-maranhenses", "fernando-de-noronha", "chapada-dos-veadeiros", "serra-da-capivara"];

/**
 * Estado A: visão geral do Brasil, em três abas: Explorar (porta de entrada),
 * Estados (navegação territorial) e Sobre. Números derivados da base (nada
 * fixo no componente); as "descobertas" usam só conteúdo já publicado.
 */
export async function OverviewView({ country }: { country: Country }) {
  const parks = await repo.listParks(country.slug);
  const ufs = new Set(parks.flatMap((p) => p.ufs)).size;
  const area = parks.reduce((n, p) => n + p.areaHa, 0);
  const oldest = parks.filter((p) => p.createdYear).sort((a, b) => a.createdYear! - b.createdYear!)[0];
  const featured = FEATURED.map((s) => parks.find((p) => p.slug === s)).filter((p) => p !== undefined);

  // Descobertas: parque em destaque, uma paisagem (maravilha com foto) e uma Expedição aprovada.
  const spotlight = featured.find((p) => p.photos[0]) ?? parks.find((p) => p.photos[0]);
  const wonderPark = [...featured, ...parks].find((p) => p.slug !== spotlight?.slug && p.guide?.wonders.some((w) => w.photo));
  const wonder = wonderPark?.guide?.wonders.find((w) => w.photo);
  const expeditionPark = [...featured, ...parks].find((p) => p.expedition?.approved);

  const stats = {
    parks: parks.length,
    guides: parks.filter((p) => p.guide).length,
    expeditions: parks.filter((p) => p.expedition?.approved).length,
    species: parks.reduce((n, p) => n + (p.biodiversity?.groups.reduce((m, g) => m + g.species.length, 0) ?? 0), 0),
  };

  const explorar = (
    <>
      <div className="px-5 pt-7">
        <p className="text-xs font-semibold tracking-[0.18em] text-earth uppercase">Atlas do Brasil natural</p>
        <h1 className="mt-2 font-display text-[34px] leading-[1.05] font-semibold text-forest-deep text-balance">
          Conheça o Brasil pelos seus parques nacionais
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Mapa, guias e expedições de {parks.length} parques, da Amazônia ao Pampa e ao mar. Toque num parque no mapa,
          escolha um bioma ou deixe o atlas sugerir por onde começar.
        </p>

        <dl className="mt-7 grid grid-cols-3 border-y border-line py-4">
          <Figure value={String(parks.length)} label="parques nacionais" />
          <Figure value={String(ufs)} label="estados com parques" divider />
          <Figure value={formatArea(area, { short: true })} label="protegidos" divider />
        </dl>
        {oldest && (
          <p className="mt-2.5 text-xs text-ink-soft">
            O mais antigo é {oldest.shortName}, criado em {oldest.createdYear}.
          </p>
        )}
      </div>

      <BiomeExplorer />

      <section className="pt-10" aria-labelledby="descobertas-titulo">
        <div className="px-5">
          <h2 id="descobertas-titulo" className="font-display text-2xl font-semibold text-forest-deep">Descobertas do atlas</h2>
          <p className="mt-1 text-sm text-ink-soft">Três portas de entrada para começar.</p>
        </div>

        {spotlight && <SpotlightCard park={spotlight} />}

        <div className="mt-4 grid gap-4 px-5">
          {wonderPark && wonder?.photo && (
            <Link href={href(wonderPark.path)} scroll={false} prefetch className="group block overflow-hidden rounded-2xl bg-card ring-1 ring-line transition hover:ring-forest/40">
              <div className="relative aspect-[16/10] overflow-hidden bg-paper-deep">
                <Image src={wonder.photo.src} alt="" fill sizes="(min-width: 768px) 400px, 90vw" className="object-cover transition duration-500 group-hover:scale-[1.03]" />
              </div>
              <div className="p-4">
                <p className="text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">Uma paisagem para conhecer</p>
                <p className="mt-1 font-display text-xl leading-tight font-semibold text-forest-deep">{wonder.title}</p>
                <p className="mt-0.5 text-sm text-ink-soft">{wonderPark.shortName}</p>
              </div>
            </Link>
          )}
          {expeditionPark?.expedition && (
            <Link href={`${href(expeditionPark.path)}/${EXPEDITION_SEGMENT}`} scroll={false} prefetch className="group block rounded-2xl bg-forest-deep p-5 text-card transition hover:bg-forest">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-card/70 uppercase">Expedição · {expeditionPark.shortName}</p>
              <p className="mt-1.5 font-display text-2xl leading-tight font-semibold text-balance">{expeditionPark.expedition.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-card/80">{expeditionPark.expedition.subtitle}</p>
              <p className="mt-3 text-sm font-medium">Ler a expedição <span aria-hidden="true" className="inline-block transition-transform group-hover:translate-x-0.5">→</span></p>
            </Link>
          )}
        </div>

        {featured.length > 1 && (
          <>
            <h3 className="mt-8 px-5 text-xs font-semibold tracking-[0.14em] text-ink-soft uppercase">Para se inspirar</h3>
            <Carousel label="Para se inspirar" className="mt-3 snap-x snap-mandatory scroll-px-5 gap-3 px-5 pb-1">
              {featured.map((p) => (
                <li key={p.slug} className="w-40 shrink-0 snap-start">
                  <Link href={href(p.path)} scroll={false} prefetch className="group block">
                    <ViewTransition name={`park-photo-${p.slug}`} share="morph" default="none">
                      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-paper-deep">
                        {p.photos[0] && <Image src={p.photos[0].src} alt="" fill sizes="160px" className="object-cover transition duration-500 group-hover:scale-[1.04]" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                          <p className="flex items-center gap-1.5 text-[11px] font-medium">
                            <span className="h-2 w-2 rounded-full ring-1 ring-white/70" style={{ background: BIOME_COLOR[p.biome] }} />
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
          </>
        )}
      </section>

      <section className="mt-10 border-t border-line px-5 pt-8 pb-2" aria-label="Por onde seguir">
        <SurpriseButton wide />
        <p className="mt-4 flex flex-wrap items-center justify-center gap-x-5 text-sm">
          <TabLink to="estados" className="min-h-11 font-medium text-forest underline underline-offset-4">Explore por estado</TabLink>
          <TabLink to="sobre" className="min-h-11 font-medium text-forest underline underline-offset-4">Conheça o Raiz</TabLink>
        </p>
      </section>
    </>
  );

  const sobre = (
    <article className="px-5 pt-7 pb-4">
      <p className="text-xs font-semibold tracking-[0.18em] text-earth uppercase">Sobre o Raiz</p>
      <h2 className="mt-2 font-display text-[30px] leading-[1.08] font-semibold text-forest-deep text-balance">Um atlas para encantar e proteger</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-ink">
        O {SITE.name} reúne os {stats.parks} parques nacionais do Brasil num só mapa, do país até cada atração. A ideia é
        encantar com informação rigorosa e incentivar quem visita a conhecer e proteger esses lugares.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-line py-5">
        <Figure value={String(stats.guides)} label="guias de parque" left />
        <Figure value={String(stats.expeditions)} label="expedições editoriais" left />
        <Figure value={stats.species.toLocaleString("pt-BR")} label="espécies nos levantamentos" left />
        <Figure value={String(ufs)} label="estados com parques" left />
      </dl>

      <h3 className="mt-8 font-display text-xl font-semibold text-forest-deep">O que você encontra</h3>
      <ul className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink">
        <li><strong className="font-semibold">Mapa e filtros.</strong> Parques por estado e por bioma, busca por nome e o botão de sorteio para quem quer ser surpreendido.</li>
        <li><strong className="font-semibold">Guia e Expedição.</strong> Cada parque tem um guia com o que protege, maravilhas e curiosidades; as expedições contam a história do lugar em paradas.</li>
        <li><strong className="font-semibold">Fauna e flora.</strong> Espécies registradas dentro do limite de cada parque, com página própria, situação de conservação e onde foram observadas.</li>
        <li><strong className="font-semibold">Mundo perdido.</strong> Espécies extintas ou que desapareceram localmente e a megafauna fóssil ligada ao parque, quando há registro.</li>
      </ul>

      <h3 className="mt-8 font-display text-xl font-semibold text-forest-deep">Como os conteúdos são feitos</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-ink">
        Os textos partem de fontes oficiais citadas em cada página, como planos de manejo e fichas do ICMBio, e só são
        publicados depois de revisados. Registros de espécies mostram onde houve observação ou coleta, não a abundância
        nem onde a espécie é mais fácil de ver. As fotografias são de autores que as publicaram com licença livre, e o
        crédito acompanha cada imagem.
      </p>

      <h3 className="mt-8 font-display text-xl font-semibold text-forest-deep">De onde vêm os dados</h3>
      <ul className="mt-3 divide-y divide-line border-y border-line text-sm leading-relaxed">
        {SOURCES.slice(0, 5).map((s) => (
          <li key={s.name} className="py-2.5">
            <a href={s.url} rel="noopener" className="font-medium text-forest underline underline-offset-2">{s.name}</a>
            <span className="text-ink-soft">: {s.use}.</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/sobre" className="font-medium text-forest underline underline-offset-4">Todas as fontes, licenças e créditos →</Link>
      </p>
      <p className="mt-3 text-sm text-ink-soft">
        Encontrou um erro? <a href={`mailto:${SITE.contact}`} className="underline underline-offset-2 hover:text-forest">{SITE.contact}</a>
      </p>
    </article>
  );

  return (
    <>
      <JsonLd data={websiteData()} />
      <HomePanel explorar={explorar} estados={<StatesTab />} sobre={sobre} />
      <p className="px-5 pt-6 pb-6 text-center text-xs leading-relaxed text-ink-soft">
        <Link href="/sobre" className="underline underline-offset-2 hover:text-forest">Sobre e créditos</Link>
        {" · "}
        <a href={`mailto:${SITE.contact}`} className="underline underline-offset-2 hover:text-forest">{SITE.contact}</a>
      </p>
    </>
  );
}

function SpotlightCard({ park }: { park: Park }) {
  const photo = park.photos[0];
  return (
    <div className="mt-4 px-5">
      <Link href={href(park.path)} scroll={false} prefetch className="group block overflow-hidden rounded-2xl">
        <ViewTransition name={`park-photo-${park.slug}`} share="morph" default="none">
          <div className="relative aspect-[4/3] overflow-hidden bg-paper-deep">
            {photo && <Image src={photo.src} alt="" fill sizes="(min-width: 768px) 400px, 90vw" priority className="object-cover transition duration-500 group-hover:scale-[1.03]" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/80">Parque em destaque</p>
              <p className="mt-1 font-display text-3xl leading-none font-semibold">{park.shortName}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-white/90">
                <span className="h-2 w-2 rounded-full ring-1 ring-white/70" style={{ background: BIOME_COLOR[park.biome] }} />
                {BIOME_LABEL[park.biome]} · {formatArea(park.areaHa, { short: true })}
              </p>
              {park.guide?.hook && <p className="mt-2 text-sm leading-snug text-white/90">{park.guide.hook}</p>}
            </div>
          </div>
        </ViewTransition>
      </Link>
    </div>
  );
}

function Figure({ value, label, divider = false, left = false }: { value: string; label: string; divider?: boolean; left?: boolean }) {
  return (
    <div className={`${divider ? "border-l border-line pl-4" : ""} ${left ? "" : "pr-2"}`}>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-display text-[34px] leading-none font-semibold text-forest-deep tabular-nums">{value}</span>
        <span className="mt-1.5 block text-[11px] leading-tight text-ink-soft">{label}</span>
      </dd>
    </div>
  );
}
