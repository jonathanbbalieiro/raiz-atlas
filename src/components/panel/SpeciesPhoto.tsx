"use client";

import Image from "next/image";
import { useState } from "react";
import { supportsImageResizing } from "@/lib/image-loader";
import type { Photo } from "@/lib/data/types";
import { GalleryProvider, PhotoOpen } from "./Gallery";

/** Retratos científicos preservam o espécime inteiro, inclusive panoramas e folhas. */
export function SpeciesPhoto({ photo, name, zoomable = true, sizes = "(min-width: 768px) 220px, 45vw" }: {
  photo?: Photo | null;
  name: string;
  sizes?: string;
  zoomable?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const available = photo && failedSrc !== photo.src;
  const picture = photo && <Image src={photo.src} alt={photo.alt || name} fill sizes={sizes}
    unoptimized={!supportsImageResizing(photo.src)} className="object-contain p-1"
    onError={() => setFailedSrc(photo.src)} />;
  return (
    <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-paper-deep">
      {available ? (
        <div className="absolute inset-0">
          {zoomable ? <GalleryProvider photos={[photo]}>
            <PhotoOpen index={0} label={`Ampliar fotografia de ${name}`}>{picture}</PhotoOpen>
          </GalleryProvider> : picture}
        </div>
      ) : (
        <p role={photo ? "status" : undefined} className="px-4 text-center text-xs leading-relaxed text-ink-soft">
          {photo ? "Fotografia indisponível no momento" : "Fotografia ainda não verificada"}
        </p>
      )}
    </div>
  );
}
