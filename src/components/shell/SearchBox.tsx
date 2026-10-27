"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useExplore } from "@/components/map/focus";
import { BIOME_COLOR, BIOME_LABEL, formatArea, href, normalize, plural } from "@/lib/labels";
import { searchMatchScore } from "@/lib/search";

interface Result {
  key: string;
  kind: "park" | "admin1";
  slug: string;
  path: string[];
  title: string;
  subtitle: string;
  color?: string;
  /** Textos normalizados (sem acento/caixa) usados na busca. */
  haystack: string[];
}

/** Sugestões com o campo vazio (escolha editorial; todos existem na base). */
const SUGGESTED = [
  "iguacu",
  "lencois-maranhenses",
  "fernando-de-noronha",
  "chapada-dos-veadeiros",
  "serra-da-capivara",
];

/**
 * Busca de parques e estados. Roda inteiramente no cliente sobre o índice já
 * carregado (nenhuma requisição por tecla), ignora acentos e maiúsculas,
 * aceita nomes parciais e abre as sugestões logo abaixo da barra.
 * Atalhos: "/" e Ctrl/⌘+K.
 */
export function SearchBox() {
  const { index, setHighlight } = useExplore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]");
      if ((e.key === "/" && !typing) || (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    // Fecha ao clicar fora da barra.
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setHighlight(null);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [setHighlight]);

  const all = useMemo<Result[]>(
    () => [
      ...index.parks.map((p) => ({
        key: `p:${p.slug}`,
        kind: "park" as const,
        slug: p.slug,
        path: [index.country, p.admin1, p.slug],
        title: p.shortName,
        subtitle: `${BIOME_LABEL[p.biome]} · ${p.ufs.join(", ")} · ${formatArea(p.areaHa, { short: true })}`,
        color: BIOME_COLOR[p.biome],
        haystack: [p.shortName, p.name, BIOME_LABEL[p.biome], ...p.ufs],
      })),
      ...index.admin1.map((a) => ({
        key: `a:${a.slug}`,
        kind: "admin1" as const,
        slug: a.slug,
        path: [index.country, a.slug],
        title: a.name,
        subtitle: a.parkCount
          ? plural(a.parkCount, "parque nacional", "parques nacionais")
          : "Sem parque nacional",
        haystack: [normalize(a.name), normalize(a.code)],
      })),
    ],
    [index],
  );

  const results = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return SUGGESTED.map((s) => all.find((r) => r.key === `p:${s}`)).filter((r) => r !== undefined);
    const ranked = all
      .map((r) => ({ r, s: searchMatchScore(r.haystack, q) }))
      .filter((x) => x.s < Infinity)
      .sort((a, b) => a.s - b.s || a.r.title.localeCompare(b.r.title, "pt"));
    const states = ranked.filter((x) => x.r.kind === "admin1").slice(0, 4);
    const parks = ranked.filter((x) => x.r.kind === "park").slice(0, 8);
    // Estados primeiro quando a correspondência com estado é melhor (ex.: "bahia").
    const statesFirst = states.length > 0 && (!parks.length || states[0].s <= parks[0].s);
    return (statesFirst ? [...states, ...parks] : [...parks, ...states]).map((x) => x.r);
  }, [all, query]);

  const choose = (r: Result) => {
    setOpen(false);
    setQuery("");
    setHighlight(null);
    inputRef.current?.blur();
    router.push(href(r.path), { scroll: false });
  };
  const move = (i: number) => {
    setActive(i);
    const r = results[i];
    setHighlight(r ? { kind: r.kind, slug: r.slug } : null);
    document.getElementById(`${listId}-${i}`)?.scrollIntoView({ block: "nearest" });
  };

  const showList = open;
  const q = query.trim();

  return (
    <div ref={rootRef} className="min-w-0 flex-1">
      <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl px-2.5 text-ink-soft focus-within:bg-paper-deep/70 hover:bg-paper-deep/50">
        <SearchIcon />
        <span className="sr-only">Buscar parque, estado ou bioma</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
            setHighlight(null);
          }}
          onFocus={() => { setOpen(true); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              setHighlight(null);
              inputRef.current?.blur();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              move(open ? Math.max(0, Math.min(active + 1, results.length - 1)) : 0);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              move(Math.max(active - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              choose(results[active]);
            } else if (e.key === "Tab") { setOpen(false); setHighlight(null); }
          }}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          placeholder="Parque, estado ou bioma"
          autoComplete="off"
          spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-soft [&::-webkit-search-cancel-button]:hidden"
        />
        {q ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setActive(0);
              setHighlight(null);
              inputRef.current?.focus();
            }}
            aria-label="Limpar busca"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-line"
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 text-[11px] text-ink-soft md:inline">
            /
          </kbd>
        )}
      </label>

      {showList && (
        <div
          className="surface absolute inset-x-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl"
          style={{ animation: "pop-in 150ms ease-out" }}
        >
          <ul
            id={listId}
            role="listbox"
            aria-label="Resultados da busca"
            className="max-h-[min(60vh,440px)] overflow-y-auto p-1.5"
          >
            {!q && (
              <li role="presentation" className="px-3 pt-2 pb-1 text-xs font-medium text-ink-soft">
                Sugestões para começar
              </li>
            )}
            {results.map((r, i) => (
              <li
                key={r.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onPointerEnter={() => move(i)}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => choose(r)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${i === active ? "bg-paper-deep" : ""}`}
              >
                {r.kind === "park" ? (
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-2 ring-card"
                    style={{ background: r.color }}
                  />
                ) : (
                  <svg
                    viewBox="0 0 16 16"
                    width="14"
                    height="14"
                    aria-hidden="true"
                    className="shrink-0 text-ink-soft"
                  >
                    <path
                      d="M2 4.5 6 3l4 1.5L14 3v8.5L10 13l-4-1.5L2 13z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">
                    <Highlighted text={r.title} query={q} />
                  </span>
                  <span className="block truncate text-xs text-ink-soft">{r.subtitle}</span>
                </span>
                <span className="shrink-0 rounded-md bg-paper-deep px-1.5 py-0.5 text-[11px] font-medium text-ink-soft">
                  {r.kind === "park" ? "Parque" : "Estado"}
                </span>
              </li>
            ))}
            {q && !results.length && (
              <li role="presentation" className="px-3 py-6 text-center text-sm text-ink-soft">
                Nenhum parque ou estado encontrado para “{q}”.
                <span className="mt-1 block text-xs">Tente “Chapada”, “Cerrado” ou combine nome e UF, como “Chapada GO”.</span>
              </li>
            )}
          </ul>
          <p className="border-t border-line px-4 py-2 text-[11px] text-ink-soft max-md:hidden">
            ↑ ↓ para navegar · Enter para abrir · Esc para fechar
          </p>
        </div>
      )}
    </div>
  );
}

/** Realça o trecho buscado no nome (comparação sem acentos). */
function Highlighted({ text, query }: { text: string; query: string }) {
  const q = normalize(query);
  const i = q ? normalize(text).indexOf(q) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-transparent font-semibold text-forest underline decoration-2 underline-offset-2">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="shrink-0"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
