import { describe, expect, test } from "bun:test";
import { NextRequest } from "next/server";
import { isApiRoute, isProtectedPage, isPublicApiRoute } from "@/lib/route-access";

// What proxy.ts does with a signed-out request, given the matchers.
function signedOutOutcome(path: string) {
  const req = new NextRequest(`http://test.local${path}`);
  if (isApiRoute(req)) return isPublicApiRoute(req) ? "allow" : "401";
  return isProtectedPage(req) ? "sign-in" : "allow";
}

describe("signed-out visitors", () => {
  test.each([
    "/",
    "/browse/movies",
    "/media/movie/438631",
    "/search?q=dune",
    "/tonight",
    "/collections/best-anime-movies",
    "/lists/00000000-0000-0000-0000-000000000000",
    "/watchlists",
    "/privacy",
    "/terms",
    "/sitemap.xml",
    "/monitoring",
    // Unknown URLs must reach the 404 page, not a sign-in wall.
    "/this-does-not-exist",
  ])("can open %s", (path) => {
    expect(signedOutOutcome(path)).toBe("allow");
  });

  test("are sent to sign-in for a saved watchlist", () => {
    expect(signedOutOutcome("/watchlists/00000000-0000-0000-0000-000000000000")).toBe("sign-in");
  });

  test.each(["/api/watchlists", "/api/watchlists/abc/items", "/api/recommendations", "/api/something-new"])(
    "get 401 from %s",
    (path) => {
      expect(signedOutOutcome(path)).toBe("401");
    }
  );

  test.each(["/api/health", "/api/webhooks/clerk"])("can reach %s", (path) => {
    expect(signedOutOutcome(path)).toBe("allow");
  });
});
