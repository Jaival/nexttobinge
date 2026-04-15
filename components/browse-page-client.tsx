"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MediaGrid } from "@/components/media-grid";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { MediaCardItem } from "@/components/media-card";

interface BrowsePageClientProps {
  items: MediaCardItem[];
  totalPages: number;
  currentPage: number;
}

export function BrowsePageClient({ items, totalPages, currentPage }: BrowsePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  }

  const safeTotal = Math.min(totalPages, 500);

  return (
    <div className="flex flex-col gap-6">
      <MediaGrid items={items} />
      {safeTotal > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => goToPage(currentPage - 1)}
          >
            <ChevronLeftIcon className="size-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {safeTotal}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= safeTotal}
            onClick={() => goToPage(currentPage + 1)}
          >
            Next
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
