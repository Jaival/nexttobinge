import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything a visitor can look at is public; only saved watchlists (pages and
// API) need an account. Detail pages and search are included because a public
// browse grid whose cards lead to a sign-in wall would be a dead end.
const isPublicRoute = createRouteMatcher([
  "/",
  "/browse(.*)",
  "/media(.*)",
  "/search(.*)",
  "/tonight",
  "/collections(.*)",
  // Shared watchlists and their preview images. The page itself returns 404
  // unless the owner made the list public; proxy.ts only decides who needs
  // to be signed in, not who may see what.
  "/lists(.*)",
  // Exactly /watchlists: signed-out visitors see their guest list there.
  // /watchlists/<id> stays protected.
  "/watchlists",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  // Fetched by crawlers and link-preview bots, which never have a session.
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image(.*)",
  // Uptime monitors and Sentry's error tunnel (see next.config.ts). Neither
  // ever has a session.
  "/api/health",
  "/monitoring(.*)",
]);

const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(
  async (auth, req) => {
    if (isPublicRoute(req)) return;

    // protect() answers with a redirect to /sign-in, which fetch() follows
    // into an HTML page. API callers get a JSON 401 instead.
    if (isApiRoute(req)) {
      const { userId } = await auth();
      if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      return;
    }

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
