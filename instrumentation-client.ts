import * as Sentry from "@sentry/nextjs";
import { SENTRY_OPTIONS } from "@/lib/sentry";

// Runs in the browser before the app becomes interactive.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    ...SENTRY_OPTIONS,
    dsn,
    // Vercel exposes VERCEL_ENV to the browser under this name.
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    // Noise control: harmless browser quirks and errors from extensions or
    // injected scripts would otherwise drown out real bugs and use up quota.
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
    denyUrls: [/^chrome-extension:\/\//, /^moz-extension:\/\//, /^safari-web-extension:\/\//],
  });
}

// Names client-side navigations in performance traces.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
