import type { Metadata } from "next";
import Link from "next/link";
import { CompassIcon } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

// Next.js adds <meta name="robots" content="noindex"> to 404 responses itself.
export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * Handles both unmatched URLs and every notFound() call (a missing title, a
 * private or deleted shared list). It lives at the root, outside app/(main),
 * because only the root not-found catches unmatched URLs, so it brings its
 * own navbar and footer.
 */
export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 sm:px-6 lg:px-8">
        <EmptyState
          icon={CompassIcon}
          title="This page isn't here"
          description="The link may be mistyped, or the list it points to was made private or deleted."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/">Go home</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/tonight">Find something to watch</Link>
              </Button>
            </div>
          }
        />
      </main>
      <SiteFooter />
    </>
  );
}
