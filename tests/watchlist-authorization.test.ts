import { beforeEach, describe, expect, mock, test } from "bun:test";
import { eq } from "drizzle-orm";
import { watchlists, watchlistItems } from "@/lib/db/schema";
import { createTestDb } from "./test-db";

// The real route handlers run against a real (in-memory) Postgres. Only the
// edges are replaced: who is signed in (Clerk), and Next's cache, which needs
// a running server.
const { db, reset } = await createTestDb();
let signedInAs: string | null = null;

mock.module("@/lib/db", () => ({ db }));
// Module mocks apply to every test file in the run, so the rest of Clerk's
// server module (createRouteMatcher, used by route-access.test.ts) stays real.
const clerkServer = await import("@clerk/nextjs/server");
mock.module("@clerk/nextjs/server", () => ({
  ...clerkServer,
  auth: async () => ({ userId: signedInAs }),
  clerkClient: async () => ({ users: { getUser: async () => ({ firstName: "Owner" }) } }),
}));
mock.module("next/cache", () => ({
  revalidateTag: () => {},
  unstable_cache: (fn: () => unknown) => fn,
}));

// Imported after the mocks so they pick them up.
const listRoute = await import("@/app/api/watchlists/[id]/route");
const itemsRoute = await import("@/app/api/watchlists/[id]/items/route");
const itemRoute = await import("@/app/api/watchlists/[id]/items/[itemId]/route");
const copyRoute = await import("@/app/api/watchlists/[id]/copy/route");
const { getPublicList } = await import("@/lib/public-lists");

const OWNER = "user_owner";
const STRANGER = "user_stranger";

function request(method: string, body?: unknown) {
  return new Request("http://test.local/api", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

async function createList({ isPublic = false } = {}) {
  const [list] = await db
    .insert(watchlists)
    .values({ userId: OWNER, name: "Sci-fi", isPublic })
    .returning();
  const [item] = await db
    .insert(watchlistItems)
    .values({ watchlistId: list.id, mediaType: "movie", mediaId: "438631", title: "Dune", status: "watched" })
    .returning();
  return { list, item };
}

const getList = (id: string) => db.query.watchlists.findFirst({ where: eq(watchlists.id, id) });

beforeEach(async () => {
  await reset();
  signedInAs = null;
});

describe("signed out", () => {
  test("every watchlist write answers 401", async () => {
    const { list, item } = await createList();
    const responses = await Promise.all([
      listRoute.PATCH(request("PATCH", { name: "x" }), ctx({ id: list.id })),
      listRoute.DELETE(request("DELETE"), ctx({ id: list.id })),
      itemsRoute.POST(request("POST", { mediaType: "movie", mediaId: "1", title: "x" }), ctx({ id: list.id })),
      itemRoute.PATCH(request("PATCH", { status: "plan" }), ctx({ id: list.id, itemId: item.id })),
      copyRoute.POST(request("POST"), ctx({ id: list.id })),
    ]);
    expect(responses.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
  });
});

describe("someone else's list", () => {
  beforeEach(() => {
    signedInAs = STRANGER;
  });

  test("can't be renamed or made public, and the answer is 404, not 403", async () => {
    const { list } = await createList();
    const res = await listRoute.PATCH(request("PATCH", { name: "Mine now", isPublic: true }), ctx({ id: list.id }));
    expect(res.status).toBe(404);
    const after = await getList(list.id);
    expect(after?.name).toBe("Sci-fi");
    expect(after?.isPublic).toBe(false);
  });

  test("can't be deleted", async () => {
    const { list } = await createList();
    const res = await listRoute.DELETE(request("DELETE"), ctx({ id: list.id }));
    expect(res.status).toBe(404);
    expect(await getList(list.id)).toBeDefined();
  });

  test("can't have items added, read or changed, even when it's public", async () => {
    const { list, item } = await createList({ isPublic: true });
    const add = await itemsRoute.POST(
      request("POST", { mediaType: "movie", mediaId: "1", title: "Spam" }),
      ctx({ id: list.id })
    );
    const read = await itemsRoute.GET(request("GET"), ctx({ id: list.id }));
    const change = await itemRoute.PATCH(request("PATCH", { status: "plan" }), ctx({ id: list.id, itemId: item.id }));
    expect([add.status, read.status, change.status]).toEqual([404, 404, 404]);
    const items = await db.select().from(watchlistItems).where(eq(watchlistItems.watchlistId, list.id));
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("watched");
  });

  test("a private list can't be copied", async () => {
    const { list } = await createList();
    const res = await copyRoute.POST(request("POST"), ctx({ id: list.id }));
    expect(res.status).toBe(404);
  });

  test("a public list can be copied, without the owner's watch status", async () => {
    const { list } = await createList({ isPublic: true });
    const res = await copyRoute.POST(request("POST"), ctx({ id: list.id }));
    expect(res.status).toBe(201);
    const { id } = (await res.json()) as { id: string };
    const copy = await getList(id);
    expect(copy?.userId).toBe(STRANGER);
    expect(copy?.isPublic).toBe(false);
    const items = await db.select().from(watchlistItems).where(eq(watchlistItems.watchlistId, id));
    expect(items.map((i) => i.status)).toEqual(["plan"]);
  });
});

describe("the owner", () => {
  beforeEach(() => {
    signedInAs = OWNER;
  });

  test("can rename and share their list", async () => {
    const { list } = await createList();
    const res = await listRoute.PATCH(request("PATCH", { name: "Best sci-fi", isPublic: true }), ctx({ id: list.id }));
    expect(res.status).toBe(200);
    const after = await getList(list.id);
    expect(after?.name).toBe("Best sci-fi");
    expect(after?.isPublic).toBe(true);
  });

  test("adding a title twice answers 409", async () => {
    const { list } = await createList();
    const res = await itemsRoute.POST(
      request("POST", { mediaType: "movie", mediaId: "438631", title: "Dune" }),
      ctx({ id: list.id })
    );
    expect(res.status).toBe(409);
  });

  test("poster URLs from unknown hosts are rejected", async () => {
    const { list } = await createList();
    const res = await itemsRoute.POST(
      request("POST", { mediaType: "movie", mediaId: "1", title: "x", posterUrl: "http://169.254.169.254/latest" }),
      ctx({ id: list.id })
    );
    expect(res.status).toBe(400);
  });
});

describe("the database itself", () => {
  test("refuses a duplicate title in one list, even past the API's check", async () => {
    const { list } = await createList();
    // Promise.resolve: Drizzle's query is a thenable, and rejects needs a Promise.
    const duplicate = Promise.resolve(
      db
        .insert(watchlistItems)
        .values({ watchlistId: list.id, mediaType: "movie", mediaId: "438631", title: "Dune again" })
    );
    await expect(duplicate).rejects.toThrow();
  });
});

describe("public list page data", () => {
  test("a private list is not served", async () => {
    const { list } = await createList();
    expect(await getPublicList(list.id)).toBeNull();
  });

  test("a public list is served without watch status", async () => {
    const { list } = await createList({ isPublic: true });
    const shared = await getPublicList(list.id);
    expect(shared?.name).toBe("Sci-fi");
    expect(shared?.ownerName).toBe("Owner");
    expect(shared?.items).toHaveLength(1);
    expect(shared?.items[0]).not.toHaveProperty("status");
  });
});
