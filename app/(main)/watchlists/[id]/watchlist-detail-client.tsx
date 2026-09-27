"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, Trash2Icon, StarIcon, ListIcon, Share2Icon, GlobeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ShareDialog } from "./share-dialog";
import type { Watchlist, WatchlistItem } from "@/lib/db/schema";

const STATUS_LABELS = {
  plan: "Plan to watch",
  watching: "Watching",
  watched: "Watched",
} as const;

const TYPE_HREF: Record<string, string> = {
  movie: "/media/movie",
  tv: "/media/tv",
  anime: "/media/anime",
};

const TYPE_LABELS: Record<string, string> = {
  movie: "Movie",
  tv: "Series",
  anime: "Anime",
};

const FILTERS = ["all", "plan", "watching", "watched"] as const;
type Filter = (typeof FILTERS)[number];

interface WatchlistDetailClientProps {
  watchlist: Watchlist;
  initialItems: WatchlistItem[];
}

export function WatchlistDetailClient({ watchlist, initialItems }: WatchlistDetailClientProps) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("all");
  const [removeTarget, setRemoveTarget] = useState<WatchlistItem | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(watchlist.isPublic);
  const [shareOpen, setShareOpen] = useState(false);

  async function handleStatusChange(item: WatchlistItem, status: "plan" | "watching" | "watched") {
    // Optimistic: the select has already moved, so reverting on failure is
    // clearer than leaving it showing a value the server never accepted.
    const previous = item.status;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)));
    try {
      const res = await fetch(`/api/watchlists/${watchlist.id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: previous } : i)));
      toast.error("Failed to update status");
    }
  }

  async function handleRemove(item: WatchlistItem) {
    setRemovingId(item.id);
    try {
      const res = await fetch(`/api/watchlists/${watchlist.id}/items?itemId=${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      // Let the exit transition finish before unmounting the row.
      window.setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== item.id));
        setRemovingId(null);
      }, 220);
      toast.success(`"${item.title}" removed`);
    } catch {
      setRemovingId(null);
      toast.error("Failed to remove item");
    }
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const counts: Record<Filter, number> = {
    all: items.length,
    plan: items.filter((i) => i.status === "plan").length,
    watching: items.filter((i) => i.status === "watching").length,
    watched: items.filter((i) => i.status === "watched").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon-sm" asChild className="mt-1">
          <Link href="/watchlists" aria-label="Back to watchlists">
            <ArrowLeftIcon />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-title truncate">{watchlist.name}</h1>
          <p className="text-meta mt-1 flex items-center gap-2 text-muted-foreground">
            {items.length} item{items.length !== 1 ? "s" : ""}
            {isPublic && (
              <>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1">
                  <GlobeIcon className="size-3" />
                  Public
                </span>
              </>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" className="mt-1 shrink-0" onClick={() => setShareOpen(true)}>
          <Share2Icon data-icon="inline-start" />
          Share
        </Button>
      </div>

      <div className="rail gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
              filter === value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            {value === "all" ? "All" : STATUS_LABELS[value]}
            <span className="text-meta opacity-70">{counts[value]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ListIcon}
          title={items.length === 0 ? "This watchlist is empty" : "Nothing with that status"}
          description={
            items.length === 0
              ? "Browse movies, series and anime, then add them here."
              : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((item) => {
            const href = `${TYPE_HREF[item.mediaType]}/${item.mediaId}`;
            const rating = item.rating
              ? (item.mediaType === "anime"
                  ? Number(item.rating) / 10
                  : Number(item.rating)
                ).toFixed(1)
              : null;

            return (
              <li
                key={item.id}
                data-removing={removingId === item.id}
                className="row-item flex items-center gap-3 rounded-xl bg-card p-2.5 ring-1 ring-border"
              >
                <Link
                  href={href}
                  className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted"
                >
                  {item.posterUrl ? (
                    <Image
                      src={item.posterUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {item.title.charAt(0)}
                    </span>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link
                    href={href}
                    className="truncate text-sm font-medium leading-snug tracking-[-0.01em] transition-colors duration-150 hover:text-primary"
                  >
                    {item.title}
                  </Link>
                  <p className="text-meta flex items-center gap-2 text-muted-foreground">
                    <span>{TYPE_LABELS[item.mediaType]}</span>
                    {item.releaseYear && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{item.releaseYear}</span>
                      </>
                    )}
                    {rating && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="flex items-center gap-1">
                          <StarIcon className="size-3 fill-rating text-rating" />
                          {rating}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Select
                    value={item.status}
                    onValueChange={(v) =>
                      handleStatusChange(item, v as "plan" | "watching" | "watched")
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-[8.5rem] text-xs"
                      aria-label={`Status for ${item.title}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["plan", "watching", "watched"] as const).map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${item.title}`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => setRemoveTarget(item)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        watchlistId={watchlist.id}
        name={watchlist.name}
        isPublic={isPublic}
        onIsPublicChange={setIsPublic}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title="Remove from watchlist?"
        description={`"${removeTarget?.title}" will be removed from ${watchlist.name}.`}
        confirmLabel="Remove"
        onConfirm={() => removeTarget && handleRemove(removeTarget)}
      />
    </div>
  );
}
