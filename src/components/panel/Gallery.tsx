"use client";

import Image from "@/components/panel/PhotoImage";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { Photo } from "@/lib/data/types";
import { hasPhotoLicense } from "@/lib/photos";

/*
 * Galeria de fotos de um parque/atração:
 *  - faixa horizontal com setas (mouse) e arraste (toque);
 *  - visualizador em tela cheia com setas, teclado (← → Esc), deslizar no
 *    celular, contador e crédito de cada foto.
 * As fotos e os créditos vêm da base (Wikimedia Commons); nada é inventado.
 */

const GalleryContext = createContext<{ photos: Photo[]; open: (i: number) => void } | null>(null);

export function GalleryProvider({ photos, children }: { photos: Photo[]; children: ReactNode }) {
  const [current, setCurrent] = useState<number | null>(null);
  const open = useCallback((i: number) => {
    if (Number.isInteger(i) && i >= 0 && i < photos.length) setCurrent(i);
  }, [photos.length]);
  return (
    <GalleryContext.Provider value={{ photos, open }}>
      {children}
      {/* Portal no body: o painel usa transform, que prenderia um "fixed" dentro dele. */}
      {current !== null &&
        photos.length > 0 &&
        createPortal(
          <Lightbox photos={photos} index={Math.min(current, photos.length - 1)} onIndex={setCurrent} onClose={() => setCurrent(null)} />,
          document.body,
        )}
    </GalleryContext.Provider>
  );
}

function useGallery() {
  const ctx = useContext(GalleryContext);
  if (!ctx) throw new Error("useGallery fora de <GalleryProvider>");
  return ctx;
}

/** Botão "Ver N fotos" (logo abaixo da capa). */
export function OpenGalleryButton() {
  const { photos, open } = useGallery();
  if (photos.length < 2) return null;
  return (
    <button
      type="button"
      onClick={() => open(0)}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-xs font-medium text-ink transition hover:bg-paper-deep pointer-coarse:h-11"
    >
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m5 17 5-5 3 3 2-2 4 4" strokeLinejoin="round" />
      </svg>
      Ver {photos.length} fotos
    </button>
  );
}

/** Capa clicável (abre a foto 0 no visualizador). */
export function CoverButton({ children, label }: { children: ReactNode; label: string }) {
  const { photos, open } = useGallery();
  if (!photos.length) return <>{children}</>;
  return (
    <button type="button" onClick={() => open(0)} aria-label={label} className="block w-full cursor-zoom-in">
      {children}
    </button>
  );
}

/** Faixa de fotos (a partir de `from`), com setas para quem usa mouse. */
export function PhotoStrip({ from = 1, heading = "Mais fotos" }: { from?: number; heading?: string }) {
  const { photos, open } = useGallery();
  const list = photos.slice(from);
  const scroller = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: list.length <= 1 });

  const update = () => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  const page = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector("li");
    el.scrollBy({ left: dir * ((card?.clientWidth ?? 260) + 12), behavior: "smooth" });
  };

  if (!list.length) return null;
  return (
    <section className="pt-7" aria-label={heading}>
      <div className="flex items-center justify-between px-5">
        <h2 className="font-display text-xl font-semibold text-forest-deep">{heading}</h2>
        {list.length > 1 && (
          <div className="flex gap-1">
            <ArrowButton dir={-1} disabled={edges.start} onClick={() => page(-1)} label="Fotos anteriores" />
            <ArrowButton dir={1} disabled={edges.end} onClick={() => page(1)} label="Próximas fotos" />
          </div>
        )}
      </div>
      <ul
        ref={scroller}
        onScroll={update}
        className="no-scrollbar mt-3 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-1"
      >
        {list.map((p, i) => (
          <li key={p.src} className="w-[78%] max-w-[300px] shrink-0 snap-start">
            <figure>
              <button
                type="button"
                onClick={() => open(from + i)}
                aria-label={`Ampliar foto ${from + i + 1} de ${photos.length}`}
                className="group relative block aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-xl bg-paper-deep"
              >
                <Image quality={90}
                  src={p.src}
                  alt={p.alt}
                  fill
                  sizes="300px"
                  className="object-contain"
                />
              </button>
              <figcaption className="pt-1.5 text-xs text-ink-soft">{p.alt}</figcaption>
              <Credit photo={p} />
            </figure>
          </li>
        ))}
        <li aria-hidden="true" className="w-2 shrink-0" />
      </ul>
    </section>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: Photo[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);
  const n = photos.length;
  const prev = useCallback(() => onIndex((index - 1 + n) % n), [index, n, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % n), [index, n, onIndex]);

  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      returnTo?.focus?.();
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const elements = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]') ?? [])]
          .filter((element) => element.getClientRects().length > 0);
        const first = elements[0], last = elements.at(-1);
        if (e.shiftKey && document.activeElement === first && last) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last && first) { e.preventDefault(); first.focus(); }
      } else if (e.key === "Escape") {
        // Impede que o Esc também feche o parque (atalho do botão "fechar").
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      } else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, prev, next]);

  const p = photos[index];
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${n}`}
      className="fixed inset-0 z-60 flex flex-col bg-[#11201a]/95 text-white"
      style={{ animation: "fade-in 160ms ease-out" }}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 50) (dx > 0 ? prev : next)();
        touch.current = null;
      }}
    >
      <div className="flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-2">
        <p className="text-sm text-white/80 tabular-nums" aria-live="polite">
          {index + 1} / {n}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar fotos"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path
              d="M3.5 3.5l9 9M12.5 3.5l-9 9"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className="relative min-h-0 flex-1" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <Image quality={90}
          key={p.src}
          src={p.src}
          alt={p.alt}
          fill
          sizes="100vw"
          className="object-contain px-2 md:px-20"
        />
        {n > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Foto anterior"
              className="absolute top-1/2 left-3 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 max-md:hidden"
            >
              <Chevron dir={-1} />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Próxima foto"
              className="absolute top-1/2 right-3 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/25 max-md:hidden"
            >
              <Chevron dir={1} />
            </button>
          </>
        )}
      </div>
      <div className="px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+14px)] text-center">
        <p className="text-sm text-white">{p.alt}</p>
        <Credit photo={p} className="text-white/75 [&_a]:decoration-white/40 [&_a:hover]:text-white" />
        {n > 1 && (
          <p className="mt-1 text-[11px] text-white/50 md:hidden">Deslize para o lado para ver as outras</p>
        )}
      </div>
    </div>
  );
}

function ArrowButton({
  dir,
  disabled,
  onClick,
  label,
}: {
  dir: 1 | -1;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-card text-ink transition hover:bg-paper-deep disabled:opacity-35 pointer-coarse:h-11 pointer-coarse:w-11"
    >
      <Chevron dir={dir} />
    </button>
  );
}

function Chevron({ dir }: { dir: 1 | -1 }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d={dir < 0 ? "M10 3 5 8l5 5" : "M6 3l5 5-5 5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Crédito exigido pelas licenças: autor, licença e origem (uma linha). */
export function Credit({ photo, className = "" }: { photo: Photo; className?: string }) {
  if (!hasPhotoLicense(photo)) return null;
  return (
    <p
      className={`truncate text-[11px] text-ink-soft ${className}`}
      title={`Foto: ${photo.author} · ${photo.license}`}
    >
      Foto:{" "}
      <a
        href={photo.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-line underline-offset-2 hover:text-forest"
      >
        {photo.author}
      </a>{" "}
      ·{" "}
      <a
        href={photo.licenseUrl}
        target="_blank"
        rel="license noopener noreferrer"
        className="underline decoration-line underline-offset-2 hover:text-forest"
      >
        {photo.license}
      </a>
    </p>
  );
}

/** Abre a foto `index` da galeria no visualizador (fotos de textos longos, como as Expedições). */
export function PhotoOpen({ index, label, children }: { index: number; label: string; children: ReactNode }) {
  const { open } = useGallery();
  return (
    <button type="button" onClick={() => open(index)} aria-label={label} className="relative block h-full w-full cursor-zoom-in">
      {children}
    </button>
  );
}
