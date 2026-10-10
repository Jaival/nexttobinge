import { pgTable, uuid, text, timestamp, boolean, integer, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";

export const mediaTypeEnum = pgEnum("media_type", ["movie", "tv", "anime"]);
export const watchStatusEnum = pgEnum("watch_status", ["plan", "watching", "watched"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const watchlists = pgTable("watchlists", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  // Anyone with the link can view a public list at /lists/<id>. Private by
  // default: sharing is something the owner opts into, never the reverse.
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const watchlistItems = pgTable("watchlist_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  watchlistId: uuid("watchlist_id")
    .notNull()
    .references(() => watchlists.id, { onDelete: "cascade" }),
  mediaType: mediaTypeEnum("media_type").notNull(),
  mediaId: text("media_id").notNull(),
  title: text("title").notNull(),
  posterUrl: text("poster_url"),
  releaseYear: text("release_year"),
  rating: text("rating"),
  status: watchStatusEnum("status").notNull().default("plan"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (t) => [
  // A title appears in a list at most once. The API checks too, but only the
  // database can stop two concurrent requests from both inserting.
  uniqueIndex("watchlist_items_media_unique").on(t.watchlistId, t.mediaType, t.mediaId),
]);

// The last episode a user has watched of a series or anime. Progress belongs
// to the user, not to a watchlist: the same show can sit in several lists, and
// you can track a show without saving it anywhere.
export const episodeProgress = pgTable("episode_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  // The Clerk id, like watchlists.user_id.
  userId: text("user_id").notNull(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  mediaId: text("media_id").notNull(),
  // Copied from TMDB/AniList so the "Up next" row can draw a card without a
  // lookup per title.
  title: text("title").notNull(),
  posterUrl: text("poster_url"),
  // Anime on AniList has no seasons (each season is its own entry), so it's always 1.
  season: integer("season").notNull(),
  episode: integer("episode").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  // One row per user and title, so "mark watched" is an upsert, not an insert
  // that a double click could run twice. Its leading user_id column also
  // serves the "everything this user is watching" query.
  uniqueIndex("episode_progress_user_media_unique").on(t.userId, t.mediaType, t.mediaId),
]);

export type EpisodeProgress = typeof episodeProgress.$inferSelect;

export type Watchlist = typeof watchlists.$inferSelect;
export type NewWatchlist = typeof watchlists.$inferInsert;
export type WatchlistItem = typeof watchlistItems.$inferSelect;
export type NewWatchlistItem = typeof watchlistItems.$inferInsert;
