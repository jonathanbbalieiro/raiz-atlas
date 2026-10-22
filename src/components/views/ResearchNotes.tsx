import type { ParkResearch, ResearchTheme } from "@/lib/data/types";

const THEME_LABEL: Record<ResearchTheme, string> = {
  geologia: "A origem das rochas",
  hidrografia: "O caminho da água",
  relevo: "O desenho do relevo",
  clima: "As estações",
  biodiversidade: "A vida protegida",
  conservação: "Por que conservar",
  história: "Tempo e memória",
  patrimônio: "Patrimônio mundial",
  arqueologia: "Vestígios humanos",
  visitação: "Exploração responsável",
};

const FIELD_LABEL: Record<string, string> = {
  areaHectares: "Área",
  yearCreated: "Ano de criação",
};

/**
 * Dossiê de pesquisa: descobertas curtas, cada uma com link direto para a
 * fonte primária. Divergências entre fontes oficiais ficam à vista.
 */
export function ResearchNotes({ research: r }: { research: ParkResearch }) {
  return (
    <section aria-labelledby="pesquisa-titulo" className="px-5 pt-7">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-earth uppercase">Histórias do território</p>
      <h2 id="pesquisa-titulo" className="mt-1 font-display text-xl leading-snug font-semibold text-forest-deep">
        {r.headline}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{r.story}</p>

      <ol className="mt-4 space-y-2.5">
        {r.notes.map((n, i) => (
          <li key={n.title} className="rounded-xl border border-line bg-card px-4 py-3">
            <p className="flex items-baseline gap-2 text-[11px] font-semibold tracking-wider text-water uppercase">
              <span className="font-display text-ink-soft tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              {THEME_LABEL[n.theme] ?? n.theme}
            </p>
            <h3 className="mt-1 font-medium text-ink">{n.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink">{n.body}</p>
            <a
              href={n.source.url}
              rel="noopener"
              className="mt-2 inline-block text-xs text-ink-soft underline decoration-line underline-offset-2 hover:text-forest"
            >
              Fonte: {n.source.label}
            </a>
          </li>
        ))}
      </ol>

      {r.openQuestions.length > 0 && (
        <div className="mt-3 rounded-xl border border-dashed border-earth/40 px-4 py-3 text-sm">
          <p className="font-medium text-ink">Em verificação</p>
          {r.openQuestions.map((q) => (
            <p key={q.field} className="mt-1 leading-relaxed text-ink-soft">
              <strong className="font-medium text-ink">{FIELD_LABEL[q.field] ?? q.field}:</strong> {q.note}
            </p>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        Resumos próprios das fontes indicadas, revisados em{" "}
        {new Date(`${r.reviewedAt}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })}. Datas,
        áreas e regras de acesso podem mudar: consulte a fonte original.
      </p>
    </section>
  );
}
