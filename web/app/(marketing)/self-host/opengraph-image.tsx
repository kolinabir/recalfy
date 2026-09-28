import { ImageResponse } from "next/og";

export const alt = "Self-host Recalfy — npx recalfy. Open source, one command, two keys.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card this page is shared with — on Hacker News, Reddit, in a chat. The
 * command is the headline because it is the whole pitch. Colors are the dark
 * theme's tokens flattened to hex, as in the site-wide card.
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
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#141418",
          color: "#f7f7f8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
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
          <div style={{ fontSize: 34, fontWeight: 600 }}>Recalfy</div>
          <div
            style={{
              marginLeft: 12,
              fontSize: 20,
              letterSpacing: "0.14em",
              color: "#9b9ba4",
              border: "1px solid #3a3a42",
              borderRadius: 999,
              padding: "8px 18px",
            }}
          >
            OPEN SOURCE · AGPL-3.0
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            Your own AI memory in Telegram.
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 22,
              alignSelf: "flex-start",
              fontSize: 44,
              fontFamily: "monospace",
              backgroundColor: "#1c1c21",
              border: "1px solid #2e2e35",
              borderRadius: 18,
              padding: "20px 34px",
            }}
          >
            <span style={{ color: "#6f6f78" }}>$</span>
            <span>npx recalfy</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#9b9ba4" }}>
          <span>One command, two keys. No domain or HTTPS.</span>
          <span style={{ color: "#6f6f78", letterSpacing: "0.06em" }}>recalfy.com/self-host</span>
        </div>
      </div>
    ),
    size,
  );
}
