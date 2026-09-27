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
 */
export const SENTRY_OPTIONS = {
  // Trace 10% of requests: enough to spot slow routes, cheap on the free tier.
  tracesSampleRate: 0.1,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { allow: ["user-agent", "referer"] },
    httpBodies: [],
    databaseQueryData: false,
    stackFrameVariables: false,
  },
} satisfies SentryOptions;
