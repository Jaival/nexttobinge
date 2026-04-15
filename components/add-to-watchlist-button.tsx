"use client";

import { useState } from "react";
import { BookmarkPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WatchlistDialog } from "@/components/watchlist-dialog";
import type { MediaCardItem } from "@/components/media-card";

interface AddToWatchlistButtonProps {
  item: MediaCardItem;
}

export function AddToWatchlistButton({ item }: AddToWatchlistButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        <BookmarkPlusIcon data-icon="inline-start" />
        Add to Watchlist
      </Button>
      <WatchlistDialog item={item} open={open} onOpenChange={setOpen} />
    </>
  );
}
