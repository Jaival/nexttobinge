import type { init } from "@sentry/nextjs";

type SentryOptions = NonNullable<Parameters<typeof init>[0]>;

/**
 * Settings shared by the server (instrumentation.ts) and the browser
 * (instrumentation-client.ts).
 *
 * Sentry's defaults collect cookies, headers, request bodies, database query
 * values and local variables. Here that would mean Clerk session cookies,
 * watchlist contents and user ids leaving for a third party. An error report
 * needs the stack trace, the route and the browser, not the user's data, so
 * collection is opt-in instead.
 *
 * tracesSampleRate is deliberately not here. Each runtime sets its own:
 * browser envelopes pass through the /monitoring tunnel, which is a Vercel
 * function billed as Fluid Compute, so the browser sends no traces.
 */
export const SENTRY_OPTIONS = {
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { allow: ["user-agent", "referer"] },
    httpBodies: [],
    databaseQueryData: false,
    stackFrameVariables: false,
  },
} satisfies SentryOptions;
