"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { removeGuestItems, useGuestWatchlist } from "@/lib/guest-watchlist";

/**
 * Renders nothing. As soon as a visitor with a guest list is signed in, it
 * sends the list to the server and, once the server confirms, clears it.
 *
 * Clearing only after success means a failed request (offline, deploy in
 * progress) just retries on the next page load. The server side is idempotent,
 * so a retry after a request that did succeed can't create duplicates.
 */
export function GuestWatchlistSync() {
  const { isSignedIn } = useAuth();
  const items = useGuestWatchlist();
  const router = useRouter();
  const inFlight = useRef(false);

  useEffect(() => {
    if (!isSignedIn || items.length === 0 || inFlight.current) return;
    inFlight.current = true;
    const sent = items;

    fetch("/api/watchlists/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: sent }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Import failed: ${res.status}`);
        const { name, imported }: { name: string; imported: number } = await res.json();
        // Only what was sent: anything saved while the request was running
        // stays for the next pass.
        removeGuestItems(sent);
        if (imported > 0) {
          toast.success(`Moved ${imported} saved title${imported === 1 ? "" : "s"} into "${name}"`);
        }
        router.refresh();
      })
      .catch(() => {})
      .finally(() => {
        inFlight.current = false;
      });
  }, [isSignedIn, items, router]);

  return null;
}
