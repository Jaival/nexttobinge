"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { StarIcon, PlusIcon, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MediaType = "movie" | "tv" | "anime";

export interface MediaCardItem {
  id: number;
  title: string;
  posterUrl: string | null;
  year: string | null;
  rating: number | null;
  type: MediaType;
}

interface MediaCardProps {
  item: MediaCardItem;
  onAddToWatchlist?: (item: MediaCardItem) => void;
  /** Only true on mixed grids. On a "Trending Anime" row the badge is noise. */
  showType?: boolean;
  className?: string;
}

const TYPE_LABELS: Record<MediaType, string> = {
  movie: "Movie",
  tv: "Series",
  anime: "Anime",
};

const TYPE_HREF: Record<MediaType, string> = {
  movie: "/media/movie",
  tv: "/media/tv",
  anime: "/media/anime",
};

/** AniList scores are 0-100, TMDB 0-10. Normalise to one decimal out of 10. */
function formatRating(item: MediaCardItem) {
  // == null, not === null: unscored search results arrive with the field
  // missing entirely, despite the type.
  if (item.rating == null || item.rating <= 0) return null;
  return (item.type === "anime" ? item.rating / 10 : item.rating).toFixed(1);
}

export function MediaCard({ item, onAddToWatchlist, showType, className }: MediaCardProps) {
  const [loaded, setLoaded] = useState(false);

  // An image served from cache can already be complete before React attaches
  // onLoad, in which case the event never fires and the poster would stay at
  // opacity 0 forever. Ref callbacks run in the commit phase, so this catches it.
  // naturalWidth is 0 when a complete image actually failed — leave those
  // hidden so the muted frame shows instead of a broken-image glyph.
  const checkComplete = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);

  const href = `${TYPE_HREF[item.type]}/${item.id}`;
  const rating = formatRating(item);

  return (
    <div className={cn("poster-card flex flex-col gap-2", className)}>
      <div className="poster-frame">
        {item.posterUrl ? (
          <Image
            src={item.posterUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 200px"
            ref={checkComplete}
            data-loaded={loaded}
            onLoad={() => setLoaded(true)}
            className="poster-img object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageIcon className="size-6" />
          </div>
        )}

        {/* Covers the poster for pointer users; kept out of the tab order so the
            title link below is the single keyboard target. */}
        <Link href={href} aria-hidden tabIndex={-1} className="absolute inset-0 z-10" />

        {/* Information the user reads — always visible, never hover-gated. */}
        {rating && (
          <span className="text-meta pointer-events-none absolute left-2 top-2 z-20 flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-white backdrop-blur-sm">
            <StarIcon className="size-3 fill-rating text-rating" />
            {rating}
          </span>
        )}

        {onAddToWatchlist && (
          <Button
            size="icon-sm"
            variant="secondary"
            className="card-reveal absolute right-2 top-2 z-20 rounded-full shadow-sm"
            onClick={() => onAddToWatchlist(item)}
            aria-label={`Add ${item.title} to a watchlist`}
          >
            <PlusIcon />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <Link
          href={href}
          className="line-clamp-2 text-sm font-medium leading-snug tracking-[-0.01em] transition-colors duration-150 hover:text-primary"
        >
          {item.title}
        </Link>
        <p className="text-meta text-muted-foreground">
          {[showType ? TYPE_LABELS[item.type] : null, item.year]
            .filter(Boolean)
            .join(" · ") || " "}
        </p>
      </div>
    </div>
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[2/3] animate-pulse rounded-xl bg-muted" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
    </div>
  );
}
