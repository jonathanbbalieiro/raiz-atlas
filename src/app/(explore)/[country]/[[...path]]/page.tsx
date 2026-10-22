import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapFocus } from "@/components/map/focus";
import { PanelHeader } from "@/components/nav/PanelHeader";
import { AttractionPanel } from "@/components/panel/AttractionPanel";
import { Admin1View } from "@/components/views/Admin1View";
import { ExpeditionView } from "@/components/views/ExpeditionView";
import { OverviewView } from "@/components/views/OverviewView";
import { ParkView } from "@/components/views/ParkView";
import { repo, type Expedition, type Park, type PlaceNode } from "@/lib/data";
import { EDITORIAL_PREVIEW, EXPEDITION_SEGMENT } from "@/lib/editorial";
import { href, plural } from "@/lib/labels";
import { buildMapFocus } from "@/lib/map-focus";

/*
 * Uma única rota atende todos os níveis:
 *   /br                                        país
 *   /br/go                                     estado
 *   /br/go/chapada-dos-veadeiros               parque (sempre sob o estado canônico)
 *   /br/go/chapada-dos-veadeiros/<atração>     atração
 *   /br/go/chapada-dos-veadeiros/expedicao     Expedição (reportagem longa do parque)
 * Todas as URLs conhecidas são geradas no build (HTML estático, indexável).
 */
export async function generateStaticParams() {
  const paths = await repo.listAllPaths();
  return paths.map(([country, ...rest]) => ({ country, path: rest }));
}

type Params = PageProps<"/[country]/[[...path]]">["params"];
type Resolved = { node: PlaceNode; expedition?: undefined } | { node: Park; expedition: Expedition };

async function resolve(params: Params): Promise<Resolved> {
  const { country, path = [] } = await params;
  const full = [country, ...path];
  if (full.length === 4 && full[3] === EXPEDITION_SEGMENT) {
    const park = await repo.getNode(full.slice(0, 3));
    if (park?.level !== "park") notFound();
    const expedition = await repo.getExpedition(country, park.slug);
    if (!expedition) notFound();
    return { node: park, expedition };
  }
  const node = await repo.getNode(full);
  if (!node) notFound();
  return { node };
}

export async function generateMetadata({ params }: PageProps<"/[country]/[[...path]]">): Promise<Metadata> {
  const { node, expedition } = await resolve(params);
  const trail = await repo.getTrail(node.path);
  const where = trail
    .slice(0, -1)
    .reverse()
    .map((t) => t.name)
    .join(", ");
  const title = expedition ? `${expedition.title} · ${node.name}` : where ? `${node.name}, ${where}` : node.name;
  const description = expedition ? expedition.subtitle : await describe(node);
  const canonical = href(expedition ? [...node.path, EXPEDITION_SEGMENT] : node.path);
  const image =
    expedition?.cover ?? (node.level === "attraction" || node.level === "park" ? node.photos[0] : undefined);
  return {
    title,
    description,
    alternates: { canonical },
    // Rascunhos só aparecem em prévia (local ou de revisão): nunca indexar.
    robots: EDITORIAL_PREVIEW || (expedition && !expedition.approved) ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      type: expedition ? "article" : "website",
      images: image
        ? [{ url: image.src, alt: image.alt, width: image.width, height: image.height }]
        : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary" },
  };
}

async function describe(node: PlaceNode): Promise<string> {
  switch (node.level) {
    case "country":
      return node.description;
    case "admin1": {
      const n = (await repo.listParks(node.path[0], node.slug)).length;
      return n
        ? `${plural(n, "parque nacional", "parques nacionais")} em ${node.name}, no mapa interativo: biomas, área, fotos e como explorar.`
        : `${node.name} não tem parque nacional. Veja os parques mais próximos no mapa interativo.`;
    }
    case "park":
    case "attraction":
      return node.shortDescription;
  }
}

/**
 * O acesso a `params` fica dentro de <Suspense>: a navegação nunca bloqueia.
 * Em produção os links já vêm pré-carregados e o conteúdo aparece direto.
 */
export default function PlacePage({ params }: PageProps<"/[country]/[[...path]]">) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <PlaceContent params={params} />
    </Suspense>
  );
}

function PanelSkeleton() {
  return (
    <div className="animate-pulse space-y-3 px-5 pt-6" aria-busy="true" aria-label="Carregando">
      <div className="h-4 w-32 rounded-full bg-ink/10" />
      <div className="h-9 w-56 rounded-xl bg-ink/10" />
      <div className="h-4 w-full rounded-full bg-ink/10" />
      <div className="h-4 w-5/6 rounded-full bg-ink/10" />
    </div>
  );
}

async function PlaceContent({ params }: { params: Params }) {
  const { node, expedition } = await resolve(params);
  const [trail, children, focus] = await Promise.all([
    repo.getTrail(node.path),
    repo.getChildren(node.path),
    buildMapFocus(node),
  ]);

  return (
    <>
      {/* Na Expedição o mapa continua enquadrado no parque, ao lado da leitura. */}
      <MapFocus {...focus} />
      {expedition ? (
        <ExpeditionView park={node} expedition={expedition} trail={trail} />
      ) : (
        <>
          {node.level === "country" && <OverviewView country={node} />}
          {node.level === "admin1" && (
            <>
              <PanelHeader trail={trail} />
              <Admin1View admin1={node} items={children} />
            </>
          )}
          {node.level === "park" && <ParkView park={node} trail={trail} items={children} />}
          {node.level === "attraction" && <AttractionPanel attraction={node} trail={trail} />}
        </>
      )}
    </>
  );
}
