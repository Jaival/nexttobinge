import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything a visitor can look at is public; only watchlists (pages and API)
// need an account. Detail pages and search are included because a public
// browse grid whose cards lead to a sign-in wall would be a dead end.
const isPublicRoute = createRouteMatcher([
  "/",
  "/browse(.*)",
  "/media(.*)",
  "/search(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
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
