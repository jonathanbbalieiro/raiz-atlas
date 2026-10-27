"use client";

import Image from "next/image";
import { useState } from "react";
import { supportsImageResizing } from "@/lib/image-loader";
import type { Photo } from "@/lib/data/types";

/** Retratos científicos preservam o espécime inteiro, inclusive panoramas e folhas. */
export function SpeciesPhoto({ photo, name, sizes = "(min-width: 768px) 220px, 45vw" }: {
  photo?: Photo | null;
  name: string;
  sizes?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const available = photo && failedSrc !== photo.src;
  return (
    <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-paper-deep">
      {available ? (
        <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer"
          aria-label={`Abrir fotografia e créditos de ${name}`} className="absolute inset-0 cursor-zoom-in">
          <Image src={photo.src} alt={photo.alt || name} fill sizes={sizes}
            unoptimized={!supportsImageResizing(photo.src)}
            className="object-contain p-1" onError={() => setFailedSrc(photo.src)} />
        </a>
      ) : (
        <p role={photo ? "status" : undefined} className="px-4 text-center text-xs leading-relaxed text-ink-soft">
          {photo ? "Fotografia indisponível no momento" : "Fotografia ainda não verificada"}
        </p>
      )}
    </div>
  );
}
