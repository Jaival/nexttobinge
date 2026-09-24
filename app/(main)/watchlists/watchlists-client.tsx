"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { PlusIcon, ListIcon, Trash2Icon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import type { Watchlist } from "@/lib/db/schema";

interface WatchlistWithCount extends Omit<Watchlist, "userId" | "updatedAt"> {
  itemCount: number;
  posters: string[];
}

interface WatchlistsClientProps {
  initialWatchlists: WatchlistWithCount[];
}

export function WatchlistsClient({ initialWatchlists }: WatchlistsClientProps) {
  const [watchlists, setWatchlists] = useState(initialWatchlists);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WatchlistWithCount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WatchlistWithCount | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [saving, setSaving] = useState(false);

  function openCreate() {
    setFormName("");
    setCreateOpen(true);
  }

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
      setWatchlists((prev) => [{ ...created, itemCount: 0, posters: [] }, ...prev]);
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
      setWatchlists((prev) =>
        prev.map((w) => (w.id === updated.id ? { ...w, name: updated.name } : w))
      );
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
    // Play the exit before unmounting, so the card does not teleport away.
    setRemovingId(wl.id);
    try {
      const res = await fetch(`/api/watchlists/${wl.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      window.setTimeout(() => {
        setWatchlists((prev) => prev.filter((w) => w.id !== wl.id));
        setRemovingId(null);
      }, 220);
      toast.success(`"${wl.name}" deleted`);
    } catch {
      setRemovingId(null);
      toast.error("Failed to delete watchlist");
    }
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        <PageHeader
          title="Watchlists"
          description="Everything you have saved, grouped how you like."
          action={
            <Button size="sm" onClick={openCreate}>
              <PlusIcon data-icon="inline-start" />
              New
            </Button>
          }
        />

        {watchlists.length === 0 ? (
          <EmptyState
            icon={ListIcon}
            title="No watchlists yet"
            description="Create your first one, then add anything you find while browsing."
            action={
              <Button onClick={openCreate}>
                <PlusIcon data-icon="inline-start" />
                Create watchlist
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {watchlists.map((wl) => (
              <li
                key={wl.id}
                data-removing={removingId === wl.id}
                className="row-item reveal-host relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-shadow hover:shadow-md"
              >
                <div className="grid grid-cols-4 gap-px bg-muted">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const poster = wl.posters[i];
                    return (
                      <div key={i} className="relative aspect-[2/3] bg-muted">
                        {poster && (
                          <Image
                            src={poster}
                            alt=""
                            fill
                            sizes="120px"
                            className="object-cover"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/watchlists/${wl.id}`}
                      className="block truncate text-sm font-medium tracking-[-0.01em] after:absolute after:inset-0 after:content-['']"
                    >
                      {wl.name}
                    </Link>
                    <p className="text-meta mt-0.5 text-muted-foreground">
                      {wl.itemCount} item{wl.itemCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Above the card-wide link overlay so they stay clickable. */}
                  <div className="card-reveal relative z-10 flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Rename ${wl.name}`}
                      onClick={() => {
                        setFormName(wl.name);
                        setEditTarget(wl);
                      }}
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete ${wl.name}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(wl)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New watchlist</DialogTitle>
            <DialogDescription>Give it a name you will recognise later.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              placeholder="e.g. Weekend binges"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="flex-1"
              enterKeyHint="done"
              autoFocus
            />
            <Button type="submit" disabled={saving || !formName.trim()}>
              Create
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename watchlist</DialogTitle>
            <DialogDescription>
              Enter a new name for &ldquo;{editTarget?.name}&rdquo;.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex gap-2">
            <Input
              placeholder="New name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="flex-1"
              enterKeyHint="done"
              autoFocus
            />
            <Button type="submit" disabled={saving || !formName.trim()}>
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete "${deleteTarget?.name}"?`}
        description="The watchlist and everything in it will be removed. This cannot be undone."
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </>
  );
}
