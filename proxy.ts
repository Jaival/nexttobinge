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

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
