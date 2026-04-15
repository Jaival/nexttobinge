"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon, ListIcon, Trash2Icon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Watchlist } from "@/lib/db/schema";

interface WatchlistWithCount extends Omit<Watchlist, "userId" | "updatedAt"> {
  itemCount: number;
}

interface WatchlistsClientProps {
  initialWatchlists: WatchlistWithCount[];
}

export function WatchlistsClient({ initialWatchlists }: WatchlistsClientProps) {
  const [watchlists, setWatchlists] = useState(initialWatchlists);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WatchlistWithCount | null>(null);
  const [formName, setFormName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = formName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setWatchlists((prev) => [{ ...created, itemCount: 0 }, ...prev]);
      setFormName("");
      setCreateOpen(false);
      toast.success(`Watchlist "${created.name}" created`);
    } catch {
      toast.error("Failed to create watchlist");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const name = formName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/watchlists/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setWatchlists((prev) => prev.map((w) => (w.id === updated.id ? { ...w, name: updated.name } : w)));
      setEditTarget(null);
      setFormName("");
      toast.success("Watchlist renamed");
    } catch {
      toast.error("Failed to rename watchlist");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(wl: WatchlistWithCount) {
    if (!confirm(`Delete "${wl.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/watchlists/${wl.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setWatchlists((prev) => prev.filter((w) => w.id !== wl.id));
      toast.success(`"${wl.name}" deleted`);
    } catch {
      toast.error("Failed to delete watchlist");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListIcon className="size-6 text-primary" />
            <h1 className="font-heading text-2xl font-semibold">My Watchlists</h1>
          </div>
          <Button size="sm" onClick={() => { setFormName(""); setCreateOpen(true); }}>
            <PlusIcon data-icon="inline-start" />
            New Watchlist
          </Button>
        </div>

        {watchlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <ListIcon className="size-12 mb-4" />
            <p className="text-lg font-medium">No watchlists yet</p>
            <p className="text-sm mb-4">Create your first watchlist to start saving shows and movies.</p>
            <Button onClick={() => { setFormName(""); setCreateOpen(true); }}>
              <PlusIcon data-icon="inline-start" />
              Create Watchlist
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {watchlists.map((wl) => (
              <Card key={wl.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate">{wl.name}</CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {wl.itemCount} item{wl.itemCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  {wl.description && (
                    <CardDescription className="line-clamp-2">{wl.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex-1" />
                <CardFooter className="flex items-center justify-between gap-2">
                  <Button asChild variant="default" size="sm">
                    <Link href={`/watchlists/${wl.id}`}>View</Link>
                  </Button>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => { setFormName(wl.name); setEditTarget(wl); }}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(wl)}
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Watchlist</DialogTitle>
            <DialogDescription>Give your watchlist a name.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              placeholder="e.g. Weekend Binges"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" disabled={saving || !formName.trim()}>
              Create
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Watchlist</DialogTitle>
            <DialogDescription>Enter a new name for &ldquo;{editTarget?.name}&rdquo;.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex gap-2">
            <Input
              placeholder="New name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="flex-1"
              autoFocus
            />
            <Button type="submit" disabled={saving || !formName.trim()}>
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
