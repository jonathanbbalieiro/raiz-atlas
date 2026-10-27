import { CONTEXT_COLOR, CONTEXT_LABEL } from "@/components/map/theme";
import type { ParkContext } from "@/lib/data/types";
import { formatArea } from "@/lib/labels";
import { ContextMapButton } from "./MapLinks";
import { H2, Kicker } from "./ParkGuide";

type Kind = ParkContext["areas"][number]["kind"];
const ORDER: Kind[] = ["protecao-integral", "uso-sustentavel", "terra-indigena", "quilombola", "rppn"];

/**
 * O parque no seu território: áreas protegidas, terras indígenas e quilombos
 * vizinhos. A lista é o conteúdo; o mapa só realça as mesmas áreas.
 */
export function ParkSurroundings({ context, parkName }: { context: ParkContext; parkName: string }) {
  const groups = ORDER.map((kind) => ({ kind, areas: context.areas.filter((a) => a.kind === kind) })).filter((g) => g.areas.length);
  const km = Math.round(context.marginDegrees * 111);
  const date = context.generatedAt.split("-").reverse().join("/");
  return (
    <section aria-labelledby="entorno" className="px-5 pt-8">
      <Kicker>No entorno</Kicker>
      <H2 id="entorno">Áreas protegidas e territórios vizinhos</H2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
        {parkName} não está isolado. Até cerca de {km} km além dos extremos do parque, as bases oficiais registram{" "}
        {context.areas.length} outras áreas: unidades de conservação, terras indígenas e territórios quilombolas.
      </p>
      <ContextMapButton label={`${parkName} e o entorno`} />
      <ul className="mt-4 space-y-3">
        {groups.map(({ kind, areas }) => (
          <li key={kind} className="rounded-xl border border-line bg-card px-4 py-3">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-sm" style={{ background: CONTEXT_COLOR[kind] }} />
              {CONTEXT_LABEL[kind]} ({areas.length})
            </p>
            {kind === "rppn" ? (
              <details className="mt-1 text-sm leading-relaxed text-ink-soft">
                <summary className="cursor-pointer py-1">Reservas criadas por proprietários, em geral pequenas. Ver nomes</summary>
                <p className="mt-1">{areas.map((a) => a.name.replace(/^Reserva Particular do Patrimônio Natural /i, "")).join(" · ")}</p>
              </details>
            ) : (
              <ul className="mt-1 space-y-1.5 text-sm leading-relaxed text-ink">
                {areas.map((a) => (
                  <li key={a.id}>
                    {a.name}
                    <span className="block text-xs text-ink-soft">
                      {[a.areaHa ? formatArea(a.areaHa) : null, a.detail].filter(Boolean).join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <details className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-soft">
        <summary className="cursor-pointer py-1 font-semibold">Sobre estes dados</summary>
        <p className="mt-2">
          Limites e situação conforme as bases oficiais consultadas em {date}. Áreas podem se sobrepor (uma APA pode conter
          reservas particulares) e as bases nem sempre trazem acentos ou a fase mais recente de cada processo.
        </p>
        <ul className="mt-2 space-y-1">
          {context.sources.map((s) => (
            <li key={s.id}><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{s.title}</a></li>
          ))}
        </ul>
      </details>
    </section>
  );
}
