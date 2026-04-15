"use client";

import { useState } from "react";
import { MediaCard, MediaCardSkeleton, type MediaCardItem } from "@/components/media-card";
import { WatchlistDialog } from "@/components/watchlist-dialog";

interface MediaGridProps {
  items: MediaCardItem[];
  loading?: boolean;
  skeletonCount?: number;
}

export function MediaGrid({ items, loading, skeletonCount = 20 }: MediaGridProps) {
  const [selected, setSelected] = useState<MediaCardItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleAddToWatchlist(item: MediaCardItem) {
    setSelected(item);
    setDialogOpen(true);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <p className="text-lg font-medium">No results found</p>
        <p className="text-sm">Try a different search or browse other categories.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {items.map((item) => (
          <MediaCard key={`${item.type}-${item.id}`} item={item} onAddToWatchlist={handleAddToWatchlist} />
        ))}
      </div>
      <WatchlistDialog item={selected} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
