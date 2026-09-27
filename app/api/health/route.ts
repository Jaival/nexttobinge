import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

const DB_TIMEOUT_MS = 3000;

/**
 * GET /api/health, for uptime monitors (Better Stack, UptimeRobot, Checkly).
 * They request it every minute or so and alert when it stops answering 200.
 *
 * It checks what this app can't work without: the server is running and
 * the database answers. TMDB and AniList are deliberately not checked. When
 * they're down, most pages still render, and an alert you can't act on
 * teaches you to ignore alerts.
 */
export async function GET() {
  const started = performance.now();
  const headers = { "Cache-Control": "no-store" };
  // Which deploy answered: handy right after a release.
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;

  // A hung connection must fail the check, not hang the monitor.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), DB_TIMEOUT_MS);
  });

  try {
    await Promise.race([db.execute(sql`select 1`), timeout]);
    const dbLatencyMs = Math.round(performance.now() - started);
    return Response.json({ status: "ok", db: "ok", dbLatencyMs, commit }, { headers });
  } catch {
    // 503 tells the monitor (and any load balancer) this instance can't serve.
    // No error details: this endpoint is public.
    return Response.json(
      { status: "degraded", db: "unreachable", commit },
      { status: 503, headers }
    );
  } finally {
    clearTimeout(timer);
  }
}
