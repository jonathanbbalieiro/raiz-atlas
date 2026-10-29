"use client";

import { createContext, useCallback, useContext, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export const HOME_TABS = [
  { id: "explorar", label: "Explorar" },
  { id: "estados", label: "Estados" },
  { id: "sobre", label: "Sobre" },
] as const;
export type HomeTab = (typeof HOME_TABS)[number]["id"];

const TabContext = createContext<(tab: HomeTab) => void>(() => {});

/** Chamada para ação que troca de aba sem sair do mapa. */
export function TabLink({ to, children, className = "" }: { to: HomeTab; children: ReactNode; className?: string }) {
  const select = useContext(TabContext);
  return <button type="button" onClick={() => select(to)} className={className}>{children}</button>;
}

/**
 * Painel da página inicial: três abas (Explorar, Estados, Sobre) que trocam o
 * conteúdo sem recarregar nada. Os três painéis ficam montados (o inativo só
 * fica oculto), então a busca de estados e a rolagem de cada aba se mantêm.
 */
export function HomePanel({ explorar, estados, sobre }: { explorar: ReactNode; estados: ReactNode; sobre: ReactNode }) {
  const [tab, setTab] = useState<HomeTab>("explorar");
  const uid = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panes: Record<HomeTab, ReactNode> = { explorar, estados, sobre };

  const select = useCallback((next: HomeTab, focus = false) => {
    setTab(next);
    if (focus) refs.current[next]?.focus();
    // Ao trocar de aba, o painel volta ao topo.
    requestAnimationFrame(() => document.getElementById("conteudo")?.scrollTo({ top: 0, behavior: "instant" }));
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    const i = HOME_TABS.findIndex((t) => t.id === tab);
    const move = (to: number) => {
      event.preventDefault();
      select(HOME_TABS[(to + HOME_TABS.length) % HOME_TABS.length].id, true);
    };
    if (event.key === "ArrowRight") move(i + 1);
    else if (event.key === "ArrowLeft") move(i - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(HOME_TABS.length - 1);
  };

  return (
    <TabContext.Provider value={(t) => select(t)}>
      <div className="sticky top-5 z-10 bg-paper/95 px-5 pt-1 backdrop-blur md:top-0 md:pt-5">
        <div role="tablist" aria-label="Seções do painel" onKeyDown={onKeyDown} className="flex gap-6 border-b border-line">
          {HOME_TABS.map((t) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => { refs.current[t.id] = el; }}
                type="button"
                role="tab"
                id={`${uid}-tab-${t.id}`}
                aria-selected={selected}
                aria-controls={`${uid}-pane-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(t.id)}
                className={`relative -mb-px min-h-11 pb-2.5 text-[15px] font-medium transition-colors ${selected ? "text-forest-deep" : "text-ink-soft hover:text-ink"}`}
              >
                {t.label}
                <span aria-hidden="true" className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-forest transition-opacity duration-200 ${selected ? "opacity-100" : "opacity-0"}`} />
              </button>
            );
          })}
        </div>
      </div>
      {HOME_TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${uid}-pane-${t.id}`}
          aria-labelledby={`${uid}-tab-${t.id}`}
          hidden={tab !== t.id}
          className="tab-pane"
        >
          {panes[t.id]}
        </div>
      ))}
    </TabContext.Provider>
  );
}
