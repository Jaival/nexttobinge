import { ImageResponse } from "next/og";

// The preview card shown when a link to the site is pasted into Discord,
// WhatsApp, X, Slack and so on. Detail pages replace it with the title's own
// artwork (see mediaMetadata in lib/seo.ts); every other page inherits this.
// Rendered once at build time and served as a static PNG.
export const alt = "NextToBinge: find your next binge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The violet palette, as baked into app/icon.svg.
const PRIMARY = "#a289f8";
const BRAND = "#de79d7";
const BACKGROUND = "#111016";
const INK = "#100c1f";

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
          background: `radial-gradient(circle at 50% -20%, ${PRIMARY}55 0%, ${BACKGROUND} 60%)`,
          backgroundColor: BACKGROUND,
          color: "#f4f2fb",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `linear-gradient(135deg, ${PRIMARY}, ${BRAND})`,
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill={INK}>
              <path
                d="M6.5 6.2v11.6a.8.8 0 0 0 1.2.7l8.9-5.8a.8.8 0 0 0 0-1.4L7.7 5.5a.8.8 0 0 0-1.2.7Z"
                stroke={INK}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <rect x="17.25" y="5.25" width="2.75" height="13.5" rx="1.375" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 600, letterSpacing: -1 }}>
            {/* Satori leaves extra space after "Next"; pull "to" back to match the navbar. */}
            <span>Next</span>
            <span style={{ color: "#a19db0", marginLeft: -4 }}>to</span>
            <span>Binge</span>
          </div>
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: -4,
            lineHeight: 1,
          }}
        >
          Find your next binge.
        </div>
        <div style={{ marginTop: 28, fontSize: 36, color: "#a19db0" }}>
          Movies, series and anime, all in one watchlist.
        </div>
      </div>
    ),
    size
  );
}
