import * as Sentry from "@sentry/nextjs";
import { SENTRY_OPTIONS } from "@/lib/sentry";

// Runs once when a server instance starts (Node.js and edge runtimes alike).
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  // No DSN (local dev, CI, forks): Sentry stays off and sends nothing.
  if (!dsn) return;

  Sentry.init({
    ...SENTRY_OPTIONS,
    dsn,
    // Keeps preview-deployment errors apart from production ones.
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  });
}

// Errors thrown while rendering Server Components or running route handlers,
// Server Actions and proxy.ts. Without this they only reach the server log.
export const onRequestError = Sentry.captureRequestError;
