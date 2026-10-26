import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#244b3b", alignItems: "center", justifyContent: "center" }}>
        <svg width="140" height="140" viewBox="0 0 64 64">
          <path d="M4 50 22 22l10 14 8-10 20 24z" fill="#8fcb85" />
          <path d="M4 50 22 22l10 14-8 14z" fill="#6fba65" />
          <circle cx="48" cy="15" r="6" fill="#e0b57a" />
        </svg>
      </div>
    ),
    size,
  );
}
