import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { isApiRoute, isProtectedPage, isPublicApiRoute } from "@/lib/route-access";

export default clerkMiddleware(
  async (auth, req) => {
    // protect() answers with a redirect to /sign-in, which fetch() follows
    // into an HTML page. API callers get a JSON 401 instead.
    if (isApiRoute(req)) {
      if (isPublicApiRoute(req)) return;
      const { userId } = await auth();
      if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return;
    }

    if (!isProtectedPage(req)) return;
    await auth.protect();
  },
  // Without these, protect() sends visitors to Clerk's hosted Account Portal
  // instead of the themed pages in app/(auth).
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" }
);

// Kept narrow on purpose: every request that matches runs this function, and
// each run is billed as Fluid Compute. Public pages, crawlers and the Sentry
// tunnel (/monitoring) skip it. ClerkProvider in the root layout is static and
// clerk-js refreshes sessions in the browser, so neither needs the proxy.
// A route must be listed here if it calls auth() or currentUser(), or if
// isProtectedPage covers it: auth() throws when this proxy did not run.
// When a new page needs auth(), add its path below.
export const config = {
  matcher: [
    "/api/:path*",
    // Also matches /watchlists itself (":path*" allows zero segments).
    "/watchlists/:path*",
    // Clerk's catch-all auth pages in app/(auth).
    "/sign-in/:path*",
    "/sign-up/:path*",
    // Clerk's Frontend API proxy on *.vercel.app. Keep it explicit: broad
    // patterns skip paths ending in .js, which would drop the proxied clerk-js
    // bundle.
    "/__clerk/:path*",
  ],
};
