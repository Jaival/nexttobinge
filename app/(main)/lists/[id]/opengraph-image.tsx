import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getPublicList } from "@/lib/public-lists";
import { isUuid } from "@/lib/utils";

// The card Discord, WhatsApp, X and Slack show when a list link is pasted:
// the list's name and its first four posters. This image is the advert.
export const alt = "A shared watchlist on NextToBinge";
export const size = { width: 1200, height: 630 };
// JPEG, not the PNG ImageResponse produces: posters are photos, which PNG
// stores at ~500 KB. WhatsApp skips preview images much above 300 KB.
export const contentType = "image/jpeg";

// Same palette as app/opengraph-image.tsx.
const PRIMARY = "#a289f8";
const BRAND = "#de79d7";
const BACKGROUND = "#111016";
const INK = "#100c1f";
const MUTED = "#a19db0";

// Cached like the page: rendered on the first fetch, then served from the
// cache until the list's tag is invalidated.
export function generateStaticParams() {
  return [];
}

const POSTERS = 4;
const POSTER_WIDTH = 168;
const POSTER_HEIGHT = 252;

/**
 * Fetches a poster and inlines it as a data URL.
 *
 * The renderer (Satori) would otherwise fetch the images itself, and one slow
 * or broken poster would fail the whole card. Here each poster gets a time
 * limit and a failure just leaves an empty tile. Satori can't decode WebP, so
 * only JPEG and PNG are used.
 */
async function inlinePoster(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(jpeg|png)/.test(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const list = isUuid(id) ? await getPublicList(id) : null;
  // Private and missing lists get no image, so nothing leaks through a
  // guessed image URL either.
  if (!list) return new Response("Not found", { status: 404 });

  const posters = await Promise.all(
    list.items
      .flatMap((item) => item.posterUrl ?? [])
      .slice(0, POSTERS)
      .map(inlinePoster)
  );
  const count = list.items.length;

  const png = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 80px",
          background: `radial-gradient(circle at 20% -20%, ${PRIMARY}55 0%, ${BACKGROUND} 60%)`,
          backgroundColor: BACKGROUND,
          color: "#f4f2fb",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: `linear-gradient(135deg, ${PRIMARY}, ${BRAND})`,
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill={INK}>
                <path
                  d="M6.5 6.2v11.6a.8.8 0 0 0 1.2.7l8.9-5.8a.8.8 0 0 0 0-1.4L7.7 5.5a.8.8 0 0 0-1.2.7Z"
                  stroke={INK}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <rect x="17.25" y="5.25" width="2.75" height="13.5" rx="1.375" />
              </svg>
            </div>
            <div style={{ display: "flex", fontSize: 28, color: MUTED }}>
              Shared watchlist · NextToBinge
            </div>
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: list.name.length > 28 ? 60 : 76,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
              // Satori's line clamp: long names end in "…" after three lines.
              display: "block",
              lineClamp: 3,
            }}
          >
            {list.name}
          </div>
          <div style={{ marginTop: 28, fontSize: 32, color: MUTED }}>
            {`${count} title${count === 1 ? "" : "s"}${list.ownerName ? ` · by ${list.ownerName}` : ""}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            width: POSTER_WIDTH * 2 + 14,
            flexShrink: 0,
          }}
        >
          {Array.from({ length: POSTERS }).map((_, i) => (
            <div
              key={i}
              style={{
                width: POSTER_WIDTH,
                height: POSTER_HEIGHT,
                borderRadius: 16,
                overflow: "hidden",
                display: "flex",
                backgroundColor: "#1d1b26",
              }}
            >
              {posters[i] && (
                // eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img>.
                <img
                  src={posters[i]}
                  alt=""
                  width={POSTER_WIDTH}
                  height={POSTER_HEIGHT}
                  style={{ objectFit: "cover" }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );

  const jpeg = await sharp(Buffer.from(await png.arrayBuffer()))
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { "Content-Type": contentType } });
}
