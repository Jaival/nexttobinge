import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Pages are public by default and only saved watchlists need an account.
// Defaulting the other way would send signed-out visitors (and crawlers)
// following a dead link to /sign-in instead of the 404 page. Each protected
// page also checks auth() itself; this list only decides who gets redirected.
// /watchlists itself stays public: signed-out visitors see their guest list.
const isProtectedPage = createRouteMatcher(["/watchlists/(.+)"]);

// API routes are the opposite: private unless listed here.
const isPublicApiRoute = createRouteMatcher([
  "/api/webhooks(.*)",
  // Uptime monitors never have a session.
  "/api/health",
]);

const isApiRoute = createRouteMatcher(["/api(.*)"]);

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

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
