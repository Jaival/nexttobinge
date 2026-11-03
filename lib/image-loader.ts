"use client";

import type { ImageLoaderProps } from "next/image";

/**
 * Every next/image goes through this loader instead of Vercel's /_next/image,
 * so the site uses no Vercel image transformations (Hobby includes 5,000 a
 * month; posters alone used more than that in a few hours).
 *
 * TMDB already serves each image at fixed widths, so the loader picks the
 * smallest one that covers the width the browser asked for. It never goes
 * above the size in `src`: a w342 poster stays at most w342, which keeps a
 * "100vw" backdrop from loading a 4K original.
 *
 * AniList, Kitsu and local images are returned as they are.
 */
const TMDB_WIDTHS = [92, 154, 185, 342, 500, 780, 1280];
const TMDB_SIZE = /^(https:\/\/image\.tmdb\.org\/t\/p\/)(w\d+|original)(\/.+)$/;

export default function imageLoader({ src, width }: ImageLoaderProps) {
  const match = TMDB_SIZE.exec(src);
  if (!match) return src;

  const [, base, size, path] = match;
  const cap = size === "original" ? Infinity : Number(size.slice(1));
  const fit = TMDB_WIDTHS.find((w) => w >= width);
  const chosen = fit === undefined ? cap : Math.min(fit, cap);
  return `${base}${chosen === Infinity ? "original" : `w${chosen}`}${path}`;
}
