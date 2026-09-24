"use client";

import { useState } from "react";
import { MediaCard, MediaCardSkeleton, type MediaCardItem } from "@/components/media-card";
import { WatchlistDialog, useRequireSignIn } from "@/components/watchlist-dialog";
import { EmptyState } from "@/components/empty-state";
import { SearchXIcon } from "lucide-react";

interface MediaGridProps {
  items: MediaCardItem[];
  loading?: boolean;
  skeletonCount?: number;
  /** Set on mixed grids (search, the "All" tab) so each card labels its type. */
  showType?: boolean;
}

// Captions need more room below than posters need beside them.
const GRID =
  "grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";

export function MediaGrid({ items, loading, skeletonCount = 18, showType }: MediaGridProps) {
  const [selected, setSelected] = useState<MediaCardItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const requireSignIn = useRequireSignIn();

  function handleAddToWatchlist(item: MediaCardItem) {
    requireSignIn(() => {
      setSelected(item);
      setDialogOpen(true);
    });
  }

  if (loading) {
    return (
      <div className={GRID}>
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
      <div className={GRID}>
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
