import { ImageResponse } from "next/og";
import { CONFIG, roman, since } from "@/lib/config";

// gambar preview saat link dikirim lewat WhatsApp / IG / dll. Dibuat sekali saat build.
export const alt = `Untuk ${CONFIG.istri}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const years = Math.max(1, since().y);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "radial-gradient(ellipse at top, #241f1a 0%, #0d0b0a 70%)", color: "#f3ece2",
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: 12, color: "#c8a96b", textTransform: "uppercase" }}>Happy Anniversary</div>
        <div style={{ fontSize: 220, fontWeight: 300, lineHeight: 1, color: "#e3cc98", marginTop: 24, letterSpacing: 8 }}>{roman(years)}</div>
        <div style={{ width: 80, height: 1, background: "#c8a96b", marginTop: 34 }} />
        <div style={{ fontSize: 40, marginTop: 30, color: "#f3ece2" }}>{`Untuk ${CONFIG.istri}`}</div>
      </div>
    ),
    size,
  );
}
