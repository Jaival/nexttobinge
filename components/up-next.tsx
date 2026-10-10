"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { MediaGrid } from "@/components/media-grid";
import type { MediaCardItem } from "@/components/media-card";

/**
 * The next episode of each show the user is part-way through. Fetched in the
 * browser for the same reason as recommendations: the home page is one cached
 * copy for everyone (see app/api/progress). Renders nothing until there is
 * something to show.
 */
export function UpNext() {
  const { isSignedIn } = useAuth();
  const [items, setItems] = useState<MediaCardItem[]>([]);

  useEffect(() => {
    if (!isSignedIn) return;
    const controller = new AbortController();
    fetch("/api/progress", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items: MediaCardItem[] }) => setItems(data.items))
      .catch(() => {});
    return () => controller.abort();
  }, [isSignedIn]);

  if (!isSignedIn || items.length === 0) return null;

  return (
    <section className="enter-fade-up flex flex-col gap-4">
      <h2 className="text-section">Up next</h2>
      <MediaGrid items={items} showType />
    </section>
  );
}
