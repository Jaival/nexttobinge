"use client";

import Image from "next/image";
import Link from "next/link";
import { StarIcon, PlusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  className?: string;
}

const TYPE_LABELS: Record<MediaType, string> = {
  movie: "Movie",
  tv: "Drama",
  anime: "Anime",
};

const TYPE_HREF: Record<MediaType, string> = {
  movie: "/media/movie",
  tv: "/media/tv",
  anime: "/media/anime",
};

export function MediaCard({ item, onAddToWatchlist, className }: MediaCardProps) {
  return (
    <div className={cn("group relative flex flex-col", className)}>
      <Link href={`${TYPE_HREF[item.type]}/${item.id}`} className="block">
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
          {item.posterUrl ? (
            <Image
              src={item.posterUrl}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
              No Image
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100">
            {item.rating !== null && item.rating > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs text-yellow-400">
                <StarIcon className="size-3 fill-yellow-400" />
                {item.type === "anime"
                  ? (item.rating / 10).toFixed(1)
                  : item.rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-2 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-1">
          <Link
            href={`${TYPE_HREF[item.type]}/${item.id}`}
            className="line-clamp-2 text-sm font-medium leading-tight hover:text-primary transition-colors"
          >
            {item.title}
          </Link>
          {onAddToWatchlist && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0 -mr-1 -mt-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => onAddToWatchlist(item)}
              title="Add to watchlist"
            >
              <PlusIcon className="size-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {TYPE_LABELS[item.type]}
          </Badge>
          {item.year && (
            <span className="text-xs text-muted-foreground">{item.year}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-[2/3] rounded-lg bg-muted animate-pulse" />
      <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
    </div>
  );
}
