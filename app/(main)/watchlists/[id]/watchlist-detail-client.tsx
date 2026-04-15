"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, Trash2Icon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Watchlist, WatchlistItem } from "@/lib/db/schema";

const STATUS_LABELS = {
  plan: "Plan to Watch",
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
  tv: "Drama",
  anime: "Anime",
};

interface WatchlistDetailClientProps {
  watchlist: Watchlist;
  initialItems: WatchlistItem[];
}

export function WatchlistDetailClient({ watchlist, initialItems }: WatchlistDetailClientProps) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<"all" | "plan" | "watching" | "watched">("all");

  async function handleStatusChange(item: WatchlistItem, status: "plan" | "watching" | "watched") {
    try {
      const res = await fetch(`/api/watchlists/${watchlist.id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)));
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleRemove(item: WatchlistItem) {
    if (!confirm(`Remove "${item.title}" from this watchlist?`)) return;
    try {
      const res = await fetch(
        `/api/watchlists/${watchlist.id}/items?itemId=${item.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success(`"${item.title}" removed`);
    } catch {
      toast.error("Failed to remove item");
    }
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const counts = {
    all: items.length,
    plan: items.filter((i) => i.status === "plan").length,
    watching: items.filter((i) => i.status === "watching").length,
    watched: items.filter((i) => i.status === "watched").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="size-8">
          <Link href="/watchlists">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold">{watchlist.name}</h1>
          {watchlist.description && (
            <p className="text-sm text-muted-foreground">{watchlist.description}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "plan", "watching", "watched"] as const).map((s) => (
          <Button
            key={s}
            variant={filter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
              {counts[s]}
            </Badge>
          </Button>
        ))}
      </div>

      <Separator />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <p className="text-lg font-medium">
            {items.length === 0 ? "This watchlist is empty" : "No items with this status"}
          </p>
          {items.length === 0 && (
            <p className="text-sm">Browse movies, dramas and anime to add them here.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-xs"
            >
              <Link
                href={`${TYPE_HREF[item.mediaType]}/${item.mediaId}`}
                className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted"
              >
                {item.posterUrl ? (
                  <Image src={item.posterUrl} alt={item.title} fill className="object-cover" sizes="56px" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    {item.title.charAt(0)}
                  </div>
                )}
              </Link>

              <div className="flex flex-1 flex-col gap-1 min-w-0">
                <Link
                  href={`${TYPE_HREF[item.mediaType]}/${item.mediaId}`}
                  className="font-medium leading-tight truncate hover:text-primary transition-colors"
                >
                  {item.title}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {TYPE_LABELS[item.mediaType]}
                  </Badge>
                  {item.releaseYear && (
                    <span className="text-xs text-muted-foreground">{item.releaseYear}</span>
                  )}
                  {item.rating && (
                    <span className="flex items-center gap-0.5 text-xs text-yellow-500">
                      <StarIcon className="size-3 fill-yellow-500" />
                      {item.mediaType === "anime"
                        ? (Number(item.rating) / 10).toFixed(1)
                        : Number(item.rating).toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={item.status}
                  onValueChange={(v) => handleStatusChange(item, v as "plan" | "watching" | "watched")}
                >
                  <SelectTrigger className="w-36 h-8 text-xs">
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
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(item)}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
