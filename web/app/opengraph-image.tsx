import { ImageResponse } from "next/og";

export const alt = "Recalfy — the memory that texts back";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The share card: dark canvas, the knot mark, the one-line promise. Colors are
 * the dark theme's tokens flattened to hex — satori can't read CSS variables.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          backgroundColor: "#141418",
          color: "#f7f7f8",
        }}
      >
        <svg width="96" height="96" viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="8"
            stroke="#f7f7f8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="41 9"
          />
          <circle cx="19.03" cy="8.94" r="2.3" fill="#f2b04e" />
        </svg>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 600,
              letterSpacing: "-0.03em",
              textAlign: "center",
            }}
          >
            The memory that texts back.
          </div>
          <div style={{ fontSize: 30, color: "#9b9ba4" }}>
            Text it facts. Ask it anything. It messages you first.
          </div>
        </div>
        <div style={{ fontSize: 24, color: "#6f6f78", letterSpacing: "0.08em" }}>
          recalfy.com
        </div>
      </div>
    ),
    size,
  );
}
