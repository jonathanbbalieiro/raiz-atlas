import Link from "next/link";
import type { PlaceSummary } from "@/lib/data/types";
import { href } from "@/lib/labels";
import { CloseButton } from "./CloseButton";

/**
 * Indicador de contexto + navegação: breadcrumb (Brasil › Estado › Parque).
 * No estado mostra "voltar"; no parque/atração mostra "fechar" (X).
 * `overlay` é a versão clara, sobre a foto de capa.
 */
export function PanelHeader({
  trail,
  overlay = false,
  closable = false,
}: {
  trail: PlaceSummary[];
  overlay?: boolean;
  /** Mostra o X (fechar) em vez da seta de voltar. */
  closable?: boolean;
}) {
  const parent = trail.at(-2);
  const current = trail.at(-1);
  // O topo da hierarquia é a visão geral ("/"), não a página /br.
  const linkFor = (t: PlaceSummary) => (t.level === "country" ? "/" : href(t.path));
  const tone = overlay
    ? {
        wrap: "text-white/85 [text-shadow:0_1px_3px_rgb(0_0_0/0.45)]",
        link: "hover:text-white",
        current: "text-white",
        back: "bg-black/40 text-white backdrop-blur-sm hover:bg-black/60",
      }
    : {
        wrap: "text-ink-soft",
        link: "hover:text-forest hover:underline",
        current: "text-ink",
        back: "border border-line bg-card text-ink hover:bg-paper-deep",
      };

  return (
    <div className={`flex items-center gap-2 px-4 pt-3 pb-3 md:pt-4 ${tone.wrap}`}>
      {parent && !closable && (
        <Link
          href={linkFor(parent)}
          scroll={false}
          prefetch
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${tone.back}`}
          aria-label={`Voltar para ${parent.name}`}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <path
              d="M10 3 5 8l5 5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </Link>
      )}
      <nav aria-label="Você está em" className="min-w-0 flex-1 text-sm">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          {trail.map((t, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={t.path.join("/")} className="flex min-w-0 items-center gap-1.5">
                {last ? (
                  <span aria-current="page" className={`truncate font-medium ${tone.current}`}>
                    {t.name}
                  </span>
                ) : (
                  <>
                    <Link href={linkFor(t)} scroll={false} prefetch className={`truncate ${tone.link}`}>
                      {t.name}
                    </Link>
                    <span aria-hidden="true" className="opacity-50">
                      ›
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {closable && parent && current && (
        <CloseButton
          fallback={linkFor(parent)}
          label={`Fechar ${current.name}`}
          tone={overlay ? "overlay" : "light"}
        />
      )}
    </div>
  );
}
