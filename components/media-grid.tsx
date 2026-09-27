"use client";

import { useState } from "react";
import { MediaCard, MediaCardSkeleton, type MediaCardItem } from "@/components/media-card";
import { WatchlistDialog, useAddToWatchlist } from "@/components/watchlist-dialog";
import { EmptyState } from "@/components/empty-state";
import { SearchXIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaGridProps {
  items: MediaCardItem[];
  loading?: boolean;
  skeletonCount?: number;
  /** Set on mixed grids (search, the "All" tab) so each card labels its type. */
  showType?: boolean;
  /** Overrides the column layout, e.g. for a row of three large picks. */
  className?: string;
}

// Captions need more room below than posters need beside them.
const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

export function MediaGrid({
  items,
  loading,
  skeletonCount = 18,
  showType,
  className,
}: MediaGridProps) {
  const [selected, setSelected] = useState<MediaCardItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const addToWatchlist = useAddToWatchlist();

  function handleAddToWatchlist(item: MediaCardItem) {
    addToWatchlist(item, () => {
      setSelected(item);
      setDialogOpen(true);
    });
  }

  if (loading) {
    return (
      <div className={cn(GRID, className)}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={SearchXIcon}
        title="Nothing here"
        description="Try a different search, or browse another category."
      />
    );
  }

  return (
    <>
      <div className={cn(GRID, className)}>
        {items.map((item) => (
          <MediaCard
            key={`${item.type}-${item.id}`}
            item={item}
            showType={showType}
            onAddToWatchlist={handleAddToWatchlist}
          />
        ))}
      </div>
      <WatchlistDialog item={selected} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
