"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { supportsImageResizing } from "@/lib/image-loader";

/** Um CDN indisponível não deve deixar o ícone de imagem quebrada sobre o conteúdo. */
export default function PhotoImage({ src, alt, onError, unoptimized, ...props }: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
  if (failedSrc === src) {
    return <span role={alt ? "img" : undefined} aria-label={alt ? `${alt}: fotografia indisponível` : undefined}
      aria-hidden={!alt} className={`${props.fill ? "absolute inset-0" : "inline-flex"} flex items-center justify-center bg-paper-deep px-2 text-center text-xs text-ink-soft`}
      style={props.fill ? undefined : { width: Number(props.width) || undefined, height: Number(props.height) || undefined }}>
      Foto indisponível
    </span>;
  }
  return <Image {...props} src={src} alt={alt}
    unoptimized={unoptimized ?? (typeof src === "string" && !supportsImageResizing(src))}
    onError={(event) => { setFailedSrc(src); onError?.(event); }} />;
}
