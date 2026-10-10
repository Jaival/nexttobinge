import { beforeEach, describe, expect, mock, test } from "bun:test";
import { episodeProgress } from "@/lib/db/schema";
import { ctx, db, request, reset, signIn } from "./app-harness";

// "Up next" asks TMDB/AniList how each show is laid out. Every show here has
// two seasons of 10 episodes, all aired.
const tmdb = await import("@/lib/tmdb");
mock.module("@/lib/tmdb", () => ({
  ...tmdb,
  getTVDetails: async (id: number) => ({
    id,
    status: "Ended",
    seasons: [
      { season_number: 0, episode_count: 5, air_date: null },
      { season_number: 1, episode_count: 10, air_date: null },
      { season_number: 2, episode_count: 10, air_date: null },
    ],
    last_episode_to_air: { season_number: 2, episode_number: 10 },
  }),
}));

// Dynamic imports, so they load after the mocks are set up.
const titleRoute = await import("@/app/api/progress/[type]/[id]/route");
const upNextRoute = await import("@/app/api/progress/route");

const ME = "user_me";
const SOMEONE_ELSE = "user_else";
const SHOW = { type: "tv", id: "1399" };
const BODY = { season: 1, episode: 3, title: "Game of Thrones", posterUrl: null };

const put = (body: unknown, target = SHOW) => titleRoute.PUT(request("PUT", body), ctx(target));
const get = (target = SHOW) => titleRoute.GET(request("GET"), ctx(target));

beforeEach(async () => {
  await reset();
  signIn(null);
});

describe("signed out", () => {
  test("every progress endpoint answers 401", async () => {
    const responses = await Promise.all([
      get(),
      put(BODY),
      titleRoute.DELETE(request("DELETE"), ctx(SHOW)),
      upNextRoute.GET(),
    ]);
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401]);
  });
});

describe("signed in", () => {
  beforeEach(() => signIn(ME));

  test("saves, reads back and resets progress", async () => {
    expect((await put(BODY)).status).toBe(200);
    expect(await (await get()).json()).toEqual({ progress: { season: 1, episode: 3 } });

    expect((await titleRoute.DELETE(request("DELETE"), ctx(SHOW))).status).toBe(204);
    expect(await (await get()).json()).toEqual({ progress: null });
  });

  test("saving twice, even at once, leaves one row with the last value", async () => {
    await Promise.all([put(BODY), put({ ...BODY, episode: 4 })]);
    await put({ ...BODY, episode: 5 });
    const rows = await db.select().from(episodeProgress);
    expect(rows).toHaveLength(1);
    expect(rows[0].episode).toBe(5);
  });

  test("anime is always season 1", async () => {
    await put({ ...BODY, season: 7 }, { type: "anime", id: "21" });
    const [row] = await db.select().from(episodeProgress);
    expect(row.season).toBe(1);
  });

  test("movies and malformed ids don't exist", async () => {
    const responses = await Promise.all([
      put(BODY, { type: "movie", id: "438631" }),
      put(BODY, { type: "tv", id: "abc" }),
    ]);
    expect(responses.map((r) => r.status)).toEqual([404, 404]);
  });

  test("rejects bad episodes and poster hosts", async () => {
    const responses = await Promise.all([
      put({ ...BODY, episode: 0 }),
      put({ ...BODY, episode: 2.5 }),
      put({ ...BODY, posterUrl: "http://169.254.169.254/latest" }),
    ]);
    expect(responses.map((r) => r.status)).toEqual([400, 400, 400]);
  });
});

describe("someone else's progress", () => {
  test("can't be read or reset", async () => {
    signIn(SOMEONE_ELSE);
    await put(BODY);

    signIn(ME);
    expect(await (await get()).json()).toEqual({ progress: null });
    await titleRoute.DELETE(request("DELETE"), ctx(SHOW));
    expect(await db.select().from(episodeProgress)).toHaveLength(1);
  });

  test("doesn't change mine", async () => {
    signIn(ME);
    await put(BODY);
    signIn(SOMEONE_ELSE);
    await put({ ...BODY, episode: 9 });

    signIn(ME);
    expect(await (await get()).json()).toEqual({ progress: { season: 1, episode: 3 } });
  });
});

describe("up next", () => {
  beforeEach(() => signIn(ME));

  test("shows the next episode, rolling into the next season, and skips finished shows", async () => {
    await put({ ...BODY, episode: 10 }, { type: "tv", id: "1" });
    await put({ ...BODY, season: 2, episode: 10 }, { type: "tv", id: "2" });
    signIn(SOMEONE_ELSE);
    await put(BODY, { type: "tv", id: "3" });
    signIn(ME);

    const res = await upNextRoute.GET();
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    const { items } = (await res.json()) as { items: { id: number; note: string }[] };
    expect(items.map((i) => [i.id, i.note])).toEqual([[1, "S2 · E1"]]);
  });
});
