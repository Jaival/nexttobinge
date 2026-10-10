import { mock } from "bun:test";
import { createTestDb } from "./test-db";

// The real route handlers run against a real (in-memory) Postgres. Only the
// edges are replaced: who is signed in (Clerk), and Next's cache, which needs
// a running server.
//
// Module mocks apply to every test file in the run, so they're set up here,
// once, and every route test imports this. Two files each mocking @/lib/db
// with their own database would replace each other's.
export const { db, reset } = await createTestDb();

let signedInAs: string | null = null;
/** Who auth() says is signed in. null for signed out. */
export function signIn(userId: string | null) {
  signedInAs = userId;
}

mock.module("@/lib/db", () => ({ db }));
// The rest of Clerk's server module (createRouteMatcher, used by
// route-access.test.ts) stays real.
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

export function request(method: string, body?: unknown) {
  return new Request("http://test.local/api", {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });
