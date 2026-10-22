import { notFound } from "next/navigation";
import { MapFocus } from "@/components/map/focus";
import { OverviewView } from "@/components/views/OverviewView";
import { repo } from "@/lib/data";
import { buildMapFocus } from "@/lib/map-focus";
import { SITE } from "@/lib/site";

/** Página inicial: visão geral do país padrão (Estado A do painel). */
export default async function Home() {
  const country = await repo.getNode([SITE.defaultCountry]);
  if (!country || country.level !== "country") notFound();
  const focus = await buildMapFocus(country);
  return (
    <>
      <MapFocus {...focus} />
      <OverviewView country={country} />
    </>
  );
}
