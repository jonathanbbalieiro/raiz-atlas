import Image from "next/image";
import { ViewTransition } from "react";
import { CoverButton } from "@/components/panel/Gallery";
import type { Photo } from "@/lib/data/types";

/**
 * Capa do parque: foto em sangria total com navegação e título por cima.
 * Só é usada quando existe foto confiável na base; sem foto, a ficha começa
 * direto pelo título (nenhuma imagem é inventada).
 */
export function ParkHero({
  slug,
  photo,
  label,
  top,
  children,
}: {
  slug: string;
  photo: Photo;
  /** Rótulo acessível do botão que amplia a foto. */
  label: string;
  /** Conteúdo sobreposto ao topo da foto (breadcrumb e fechar). */
  top: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden md:rounded-t-2xl">
      <CoverButton label={label}>
        <ViewTransition name={`park-photo-${slug}`} share="morph" default="none">
          <div className="relative aspect-[4/3] w-full bg-paper-deep">
            <Image quality={90}
              src={photo.src}
              alt={photo.alt}
              fill
              priority
              sizes="(min-width: 768px) 420px, 100vw"
              className="object-cover"
            />
          </div>
        </ViewTransition>
      </CoverButton>
      {/* Degradês só onde há texto (topo e base), para manter a foto limpa. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute inset-x-0 top-0">{top}</div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 p-5 text-white">{children}</div>
    </div>
  );
}
