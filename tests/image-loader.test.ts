import { describe, expect, test } from "bun:test";
import imageLoader from "@/lib/image-loader";

const tmdb = (size: string) => `https://image.tmdb.org/t/p/${size}/abc.jpg`;

describe("imageLoader", () => {
  test("picks the smallest TMDB width that covers the request", () => {
    expect(imageLoader({ src: tmdb("w500"), width: 64 })).toBe(tmdb("w92"));
    expect(imageLoader({ src: tmdb("w500"), width: 256 })).toBe(tmdb("w342"));
    expect(imageLoader({ src: tmdb("original"), width: 1080 })).toBe(tmdb("w1280"));
  });

  test("never goes above the size in src", () => {
    expect(imageLoader({ src: tmdb("w342"), width: 828 })).toBe(tmdb("w342"));
    expect(imageLoader({ src: tmdb("w1280"), width: 3840 })).toBe(tmdb("w1280"));
  });

  test("uses the original only when src asks for it and nothing smaller covers", () => {
    expect(imageLoader({ src: tmdb("original"), width: 3840 })).toBe(tmdb("original"));
  });

  test("returns other hosts and local files unchanged", () => {
    const anilist = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/x.jpg";
    expect(imageLoader({ src: anilist, width: 640 })).toBe(anilist);
    expect(imageLoader({ src: "/tmdb-logo.svg", width: 640 })).toBe("/tmdb-logo.svg");
  });
});
