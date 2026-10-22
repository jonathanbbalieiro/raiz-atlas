"use client";

/**
 * Controles do mapa: aproximar, afastar, visão do Brasil e recentralizar na
 * seleção (só aparece depois que o usuário move o mapa). Ficam sempre fora do
 * painel: no desktop à esquerda dele (via --panel-offset), no celular à
 * direita, abaixo da busca e dos filtros.
 */
export function MapControls({
  ready,
  drifted,
  atHome,
  onZoomIn,
  onZoomOut,
  onHome,
  onRecenter,
  relief3d,
  onToggleRelief,
}: {
  ready: boolean;
  drifted: boolean;
  atHome: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onHome: () => void;
  onRecenter: () => void;
  /** Estado do relevo 3D; undefined esconde o botão (fora de parque/atração). */
  relief3d?: boolean;
  onToggleRelief: () => void;
}) {
  if (!ready) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 flex flex-col items-end gap-2 max-md:top-[calc(env(safe-area-inset-top)+128px)] max-md:right-3 md:right-[calc(var(--panel-offset,0px)+12px)] md:bottom-10 md:transition-[right] md:duration-200"
      aria-label="Controles do mapa"
      role="group"
    >
      {drifted && (
        <ControlButton
          label="Recentralizar na seleção"
          onClick={onRecenter}
          className="animate-[pop-in_160ms_ease-out]"
        >
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </ControlButton>
      )}
      {relief3d !== undefined && (
        <button
          type="button"
          onClick={onToggleRelief}
          aria-pressed={relief3d}
          title={relief3d ? "Desligar relevo 3D (mais leve)" : "Ligar relevo 3D (mais pesado)"}
          className={`surface pointer-events-auto flex h-11 min-w-11 items-center justify-center rounded-xl px-2 text-xs font-semibold transition md:h-10 md:min-w-10 ${
            relief3d ? "bg-forest text-card hover:bg-forest-deep" : "text-ink hover:bg-paper-deep"
          }`}
        >
          3D
          <span className="sr-only">: relevo {relief3d ? "ligado" : "desligado"}</span>
        </button>
      )}
      <ControlButton label={atHome ? "Enquadrar o Brasil" : "Voltar à visão do Brasil"} onClick={onHome}>
        <path d="M4 11.5 12 5l8 6.5" />
        <path d="M6.5 10v9h11v-9" />
      </ControlButton>
      <div className="surface pointer-events-auto flex flex-col overflow-hidden rounded-xl max-md:hidden">
        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Aproximar"
          className="flex h-10 w-10 items-center justify-center text-ink hover:bg-paper-deep"
        >
          <Icon>
            <path d="M12 6v12M6 12h12" />
          </Icon>
        </button>
        <span aria-hidden="true" className="mx-2 h-px bg-line" />
        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Afastar"
          className="flex h-10 w-10 items-center justify-center text-ink hover:bg-paper-deep"
        >
          <Icon>
            <path d="M6 12h12" />
          </Icon>
        </button>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`surface pointer-events-auto flex h-11 w-11 items-center justify-center rounded-xl text-ink transition hover:bg-paper-deep md:h-10 md:w-10 ${className}`}
    >
      <Icon>{children}</Icon>
    </button>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}
