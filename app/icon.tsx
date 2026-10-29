import { ImageResponse } from "next/og";

// favicon: hati emas di latar hitam hangat (dibuat saat build)
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0b0a", borderRadius: 14 }}>
        <svg width="44" height="40" viewBox="0 0 24 22">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f3dfae" />
              <stop offset="1" stopColor="#b8925a" />
            </linearGradient>
          </defs>
          <path d="M12 21s-9-5.6-9-12.2C3 5.6 5.4 3 8.4 3c1.6 0 2.9.8 3.6 2 .7-1.2 2-2 3.6-2C18.6 3 21 5.6 21 8.8 21 15.4 12 21 12 21z" fill="url(#g)" />
        </svg>
      </div>
    ),
    size,
  );
}
