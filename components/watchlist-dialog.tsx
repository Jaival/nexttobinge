"use client";

import { useState, useEffect } from "react";
import { PlusIcon, CheckIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { MediaCardItem } from "@/components/media-card";
import type { Watchlist } from "@/lib/db/schema";

interface WatchlistDialogProps {
  item: MediaCardItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WatchlistDialog({ item, open, onOpenChange }: WatchlistDialogProps) {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetch("/api/watchlists")
        .then((r) => r.json())
        .then((data) => setWatchlists(data))
        .catch(() => toast.error("Failed to load watchlists"))
        .finally(() => setLoading(false));
    }
  }, [open]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const created: Watchlist = await res.json();
      setWatchlists((prev) => [...prev, created]);
      setNewName("");
      toast.success(`Watchlist "${created.name}" created`);
    } catch {
      toast.error("Failed to create watchlist");
    } finally {
      setCreating(false);
    }
  }

  async function handleAdd(watchlistId: string) {
    if (!item) return;
    setAdding(watchlistId);
    try {
      const res = await fetch(`/api/watchlists/${watchlistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType: item.type,
          mediaId: String(item.id),
          title: item.title,
          posterUrl: item.posterUrl,
          releaseYear: item.year,
          rating: item.rating !== null ? String(item.rating) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (err.error === "already_exists") {
          toast.info("Already in this watchlist");
          return;
        }
        throw new Error();
      }
      const wl = watchlists.find((w) => w.id === watchlistId);
      toast.success(`Added to "${wl?.name ?? "watchlist"}"`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to add to watchlist");
    } finally {
      setAdding(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
          <DialogDescription className="line-clamp-1">
            {item?.title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
              ))}
            </div>
          ) : watchlists.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-muted-foreground">
              <ListIcon className="size-8" />
              <p className="text-sm">No watchlists yet. Create one below.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
              {watchlists.map((wl) => (
                <Button
                  key={wl.id}
                  variant="ghost"
                  className="justify-start gap-2"
                  disabled={adding === wl.id}
                  onClick={() => handleAdd(wl.id)}
                >
                  {adding === wl.id ? (
                    <CheckIcon className="size-4 text-primary" />
                  ) : (
                    <PlusIcon className="size-4" />
                  )}
                  <span className="truncate">{wl.name}</span>
                </Button>
              ))}
            </div>
          )}

          <Separator />

          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              placeholder="New watchlist name…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={creating || !newName.trim()}>
              Create
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
