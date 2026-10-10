"use client";

import { useEffect } from "react";
import { Geist } from "next/font/google";
import * as Sentry from "@sentry/nextjs";
import { TriangleAlertIcon } from "lucide-react";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider, PALETTE_SCRIPT } from "@/components/theme-provider";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

/**
 * The last resort: replaces the root layout when it throws, so nothing from
 * app/layout.tsx is available here, including ClerkProvider (and with it the
 * navbar). It brings its own <html>, styles, font and theme.
 *
 * React swallows errors caught by this boundary, so they are reported here.
 * Sentry's guide for Next.js asks for this file for that reason.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full antialiased font-sans", geistSans.variable)}
    >
      <head>
        <title>Something went wrong · NextToBinge</title>
        <script dangerouslySetInnerHTML={{ __html: PALETTE_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col justify-center">
        <ThemeProvider>
          <EmptyState
            icon={TriangleAlertIcon}
            title="Something went wrong"
            description="NextToBinge didn't load. It's often temporary, so try again in a moment."
            action={
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => unstable_retry()}>Try again</Button>
                  {/* A full page load, not <Link>: the router is what failed. */}
                  <Button variant="outline" onClick={() => window.location.assign("/")}>
                    Go home
                  </Button>
                </div>
                {error.digest && (
                  <p className="font-mono text-xs text-muted-foreground">
                    Error ID {error.digest}
                  </p>
                )}
              </div>
            }
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
