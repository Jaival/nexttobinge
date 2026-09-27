"use client";

import Image from "next/image";
import Link from "next/link";
import { SignUpButton } from "@clerk/nextjs";
import { BookmarkIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { removeGuestItems, useGuestWatchlist } from "@/lib/guest-watchlist";
import { GUEST_LIMIT } from "@/lib/guest-watchlist-rules";

const TYPE_HREF = { movie: "/media/movie", tv: "/media/tv", anime: "/media/anime" } as const;
const TYPE_LABELS = { movie: "Movie", tv: "Series", anime: "Anime" } as const;

/** /watchlists for a signed-out visitor: whatever they've saved in this browser. */
export function GuestWatchlist() {
  const items = useGuestWatchlist();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your watchlist"
        description={
          items.length > 0
            ? `${items.length} of ${GUEST_LIMIT} titles, saved in this browser only.`
            : undefined
        }
        action={
          <SignUpButton mode="modal">
            <Button size="sm" className="rounded-full px-3.5">
              Sign up to keep it
            </Button>
          </SignUpButton>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={BookmarkIcon}
          title="Nothing saved yet"
          description="Press + on any poster to save it here. No account needed until you want one."
          action={
            <Button asChild variant="secondary" size="sm">
              <Link href="/">Find something to watch</Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            Clearing your browser data would lose these. Sign up and they move into your
            account, ready on every device.
          </p>
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const href = `${TYPE_HREF[item.type]}/${item.id}`;
              return (
                <li
                  key={`${item.type}-${item.id}`}
                  className="row-item flex items-center gap-3 rounded-xl bg-card p-2.5 ring-1 ring-border"
                >
                  <Link
                    href={href}
                    className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted"
                  >
                    {item.posterUrl ? (
                      <Image src={item.posterUrl} alt="" fill className="object-cover" sizes="56px" />
                    ) : (
                      <span className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        {item.title.charAt(0)}
                      </span>
                    )}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      href={href}
                      className="truncate text-sm font-medium leading-snug tracking-[-0.01em] transition-colors duration-150 hover:text-primary"
                    >
                      {item.title}
                    </Link>
                    <p className="text-meta text-muted-foreground">
                      {[TYPE_LABELS[item.type], item.year].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${item.title}`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeGuestItems([item])}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
