import { createRouteMatcher } from "@clerk/nextjs/server";

// Who needs to be signed in for which URL. proxy.ts applies these; they live
// here so tests can check them without running Clerk's middleware.

// Pages are public by default and only saved watchlists need an account.
// Defaulting the other way would send signed-out visitors (and crawlers)
// following a dead link to /sign-in instead of the 404 page. Each protected
// page also checks auth() itself; this list only decides who gets redirected.
// /watchlists itself stays public: signed-out visitors see their guest list.
export const isProtectedPage = createRouteMatcher(["/watchlists/(.+)"]);

// API routes are the opposite: private unless listed here.
export const isPublicApiRoute = createRouteMatcher([
  "/api/webhooks(.*)",
  // Uptime monitors never have a session.
  "/api/health",
]);

export const isApiRoute = createRouteMatcher(["/api(.*)"]);
