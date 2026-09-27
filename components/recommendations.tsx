"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { MediaGrid } from "@/components/media-grid";
import type { MediaCardItem, MediaType } from "@/components/media-card";

interface Row {
  seed: { title: string; type: MediaType; id: number };
  items: MediaCardItem[];
}

/**
 * "Because you saved…" rows. Fetched in the browser so the page around it can
 * stay a single cached copy for everyone (see app/api/recommendations).
 * Renders nothing for visitors who are signed out or haven't saved anything.
 */
export function Recommendations() {
  const { isSignedIn } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!isSignedIn) return;
    const controller = new AbortController();
    fetch("/api/recommendations", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { rows: [] }))
      .then((data: { rows: Row[] }) => setRows(data.rows))
      // Recommendations are a bonus; if they fail, the page just doesn't have them.
      .catch(() => {});
    return () => controller.abort();
  }, [isSignedIn]);

  if (!isSignedIn || rows.length === 0) return null;

  return rows.map(({ seed, items }) => (
    <section key={`${seed.type}-${seed.id}`} className="enter-fade-up flex flex-col gap-4">
      <h2 className="text-section">
        Because you saved{" "}
        <Link
          href={`/media/${seed.type}/${seed.id}`}
          className="text-primary transition-opacity duration-150 hover:opacity-80"
        >
          {seed.title}
        </Link>
      </h2>
      <MediaGrid items={items} />
    </section>
  ));
}
