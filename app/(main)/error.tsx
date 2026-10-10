"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { TriangleAlertIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";

/**
 * Shown in place of a page that threw, inside app/(main)'s layout, so the
 * navbar and footer stay usable.
 *
 * Errors from Server Components arrive with a digest and are already reported
 * by onRequestError in instrumentation.ts. Only browser-side errors (no
 * digest) are sent from here, so each error is reported once.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    if (!error.digest) Sentry.captureException(error);
  }, [error]);

  return (
    <EmptyState
      icon={TriangleAlertIcon}
      title="Something went wrong"
      description="This page didn't load. It's often temporary, so try again in a moment."
      action={
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => unstable_retry()}>Try again</Button>
            <Button asChild variant="outline">
              <Link href="/">Go home</Link>
            </Button>
          </div>
          {/* Matches the server log entry if someone reports the problem. */}
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground">Error ID {error.digest}</p>
          )}
        </div>
      }
    />
  );
}
