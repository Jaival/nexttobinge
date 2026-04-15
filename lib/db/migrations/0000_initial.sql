CREATE TYPE "media_type" AS ENUM('movie', 'tv', 'anime');
CREATE TYPE "watch_status" AS ENUM('plan', 'watching', 'watched');

CREATE TABLE "watchlists" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "watchlist_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "watchlist_id" uuid NOT NULL REFERENCES "watchlists"("id") ON DELETE CASCADE,
  "media_type" "media_type" NOT NULL,
  "media_id" text NOT NULL,
  "title" text NOT NULL,
  "poster_url" text,
  "release_year" text,
  "rating" text,
  "status" "watch_status" DEFAULT 'plan' NOT NULL,
  "added_at" timestamp DEFAULT now() NOT NULL
);
