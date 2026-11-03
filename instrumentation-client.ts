import * as Sentry from "@sentry/nextjs";
import { SENTRY_OPTIONS } from "@/lib/sentry";

// Runs in the browser before the app becomes interactive.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    ...SENTRY_OPTIONS,
    dsn,
    // Browser envelopes go through the /monitoring tunnel (a Vercel function),
    // so each one costs Fluid Compute. Send errors only: no traces (Vercel
    // Speed Insights covers web vitals), no per-page-load session envelope,
    // no client reports. The tunnel stays so error reports pass ad blockers.
    tracesSampleRate: 0,
    sendClientReports: false,
    integrations: (defaults) => defaults.filter((i) => i.name !== "BrowserSession"),
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

// Names client-side navigations in performance traces. Harmless with traces
// off (no spans are created), and it is needed again if tracing is re-enabled.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
