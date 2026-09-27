import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().min(1),
    TMDB_API_KEY: z.string().min(1),
    // Public origin, e.g. https://nexttobinge.com. Optional: lib/seo.ts falls
    // back to Vercel's production URL, then localhost.
    SITE_URL: z.url().optional(),
    // Search Console's HTML-tag verification code. Optional: verifying with a
    // DNS TXT record instead needs nothing in the app.
    GOOGLE_SITE_VERIFICATION: z.string().min(1).optional(),
  },
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    // Sentry is off without it (local dev, CI, forks). A DSN only allows
    // sending events, so it's safe in the browser bundle.
    NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    SITE_URL: process.env.SITE_URL,
    GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
  // For CI jobs that load next.config.ts without running the app (lint,
  // type generation). Never set it where the app actually runs.
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  // An empty value in a dashboard or .env file counts as unset, so optional
  // variables left blank don't fail validation.
  emptyStringAsUndefined: true,
});
