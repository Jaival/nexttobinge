import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { sql } from "drizzle-orm";
import * as schema from "@/lib/db/schema";

/**
 * An in-memory Postgres (PGlite, Postgres compiled to WebAssembly) built by
 * the real migrations, so constraints like the unique watchlist-item index
 * are the ones production has. No Docker, no network, no shared state.
 */
export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "lib/db/migrations" });
  return {
    db,
    /** Empties every table between tests. */
    reset: () => db.execute(sql`TRUNCATE watchlist_items, watchlists, users CASCADE`),
  };
}
