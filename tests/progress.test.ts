import { describe, expect, test } from "bun:test";
import { nextEpisode, type EpisodeGuide } from "@/lib/progress";

// Two finished seasons and a third that is airing: 4 of its 8 episodes are out.
const airing: EpisodeGuide = {
  seasons: [
    { number: 1, episodes: 10 },
    { number: 2, episodes: 8 },
    { number: 3, episodes: 8 },
  ],
  lastAired: { season: 3, episode: 4 },
  ended: false,
};

const ended: EpisodeGuide = { ...airing, lastAired: { season: 3, episode: 8 }, ended: true };

describe("nextEpisode", () => {
  test("starts at the first episode", () => {
    expect(nextEpisode(airing, null)).toEqual({ kind: "next", season: 1, episode: 1 });
  });

  test("moves along within a season", () => {
    expect(nextEpisode(airing, { season: 1, episode: 4 })).toEqual({ kind: "next", season: 1, episode: 5 });
  });

  test("rolls over to the next season after the last episode", () => {
    expect(nextEpisode(airing, { season: 1, episode: 10 })).toEqual({ kind: "next", season: 2, episode: 1 });
  });

  test("stops at the newest aired episode, even though more are announced", () => {
    expect(nextEpisode(airing, { season: 3, episode: 4 })).toEqual({ kind: "waiting" });
  });

  test("is finished after the last episode of an ended show", () => {
    expect(nextEpisode(ended, { season: 3, episode: 8 })).toEqual({ kind: "finished" });
  });

  test("skips a season number that isn't listed (TMDB has gaps)", () => {
    const gappy: EpisodeGuide = {
      seasons: [{ number: 1, episodes: 2 }, { number: 3, episodes: 2 }],
      lastAired: null,
      ended: true,
    };
    expect(nextEpisode(gappy, { season: 1, episode: 2 })).toEqual({ kind: "next", season: 3, episode: 1 });
  });

  test("an anime with no known total runs up to what has aired", () => {
    const onePiece: EpisodeGuide = {
      seasons: [{ number: 1, episodes: null }],
      lastAired: { season: 1, episode: 1180 },
      ended: false,
    };
    expect(nextEpisode(onePiece, { season: 1, episode: 1179 })).toEqual({ kind: "next", season: 1, episode: 1180 });
    expect(nextEpisode(onePiece, { season: 1, episode: 1180 })).toEqual({ kind: "waiting" });
  });

  test("with nothing known at all, the next episode is always offered", () => {
    const unknown: EpisodeGuide = { seasons: [{ number: 1, episodes: null }], lastAired: null, ended: false };
    expect(nextEpisode(unknown, { season: 1, episode: 40 })).toEqual({ kind: "next", season: 1, episode: 41 });
  });
});
