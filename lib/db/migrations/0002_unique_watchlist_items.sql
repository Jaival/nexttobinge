-- One row per title per watchlist. The API already checks before inserting,
-- but two requests arriving together can both pass that check; the index
-- makes the database reject the second. It also lets the guest-watchlist
-- import use ON CONFLICT DO NOTHING, so running the import twice is harmless.

-- The index can't be created while duplicates exist. Keep the oldest copy of
-- each title (it holds the user's status) and delete the rest.
DELETE FROM "watchlist_items" a
USING "watchlist_items" b
WHERE a."watchlist_id" = b."watchlist_id"
  AND a."media_type" = b."media_type"
  AND a."media_id" = b."media_id"
  AND (a."added_at", a."id") > (b."added_at", b."id");

CREATE UNIQUE INDEX IF NOT EXISTS "watchlist_items_media_unique"
  ON "watchlist_items" ("watchlist_id", "media_type", "media_id");
