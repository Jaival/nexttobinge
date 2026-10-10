CREATE TABLE "episode_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"media_type" "media_type" NOT NULL,
	"media_id" text NOT NULL,
	"title" text NOT NULL,
	"poster_url" text,
	"season" integer NOT NULL,
	"episode" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "episode_progress_user_media_unique" ON "episode_progress" USING btree ("user_id","media_type","media_id");