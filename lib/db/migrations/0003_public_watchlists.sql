-- Lets an owner share a watchlist at /lists/<id>.
--
-- Additive and safe to run on a live database: existing rows get the default
-- (private), so nothing becomes visible that wasn't before. Since Postgres 11,
-- adding a column with a constant default doesn't rewrite the table.
--
-- Run this BEFORE deploying the code that uses it. Drizzle names every column
-- in its SELECTs, so the new code fails on a database without the column.
ALTER TABLE "watchlists"
  ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL;
