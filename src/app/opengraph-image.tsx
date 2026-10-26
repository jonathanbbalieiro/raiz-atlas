import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagem de compartilhamento padrão (páginas sem foto própria). */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "linear-gradient(135deg, #1b3a2d 0%, #244b3b 60%, #3a6b52 100%)",
          color: "#f6f1e7",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 6, color: "#e0b57a" }}>ATLAS DOS PARQUES NACIONAIS</div>
        <div style={{ fontSize: 168, fontWeight: 700, marginTop: 12 }}>{SITE.name}</div>
        <div style={{ fontSize: 40, marginTop: 8, opacity: 0.9 }}>77 parques, do mapa do Brasil a cada atração</div>
      </div>
    ),
    size,
  );
}
