import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListIcon } from "lucide-react";
import { MediaGrid } from "@/components/media-grid";
import { EmptyState } from "@/components/empty-state";
import { ShareLinkButton } from "@/components/share-link-button";
import { getPublicList, publicListPath } from "@/lib/public-lists";
import { SITE_NAME } from "@/lib/seo";
import { isUuid } from "@/lib/utils";
import { SaveCopyButton } from "./save-copy-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Incremental Static Regeneration: no list is rendered at build time, each
// one is rendered on its first visit and then served from the cache. The API
// routes invalidate it by tag whenever the owner changes the list.
export function generateStaticParams() {
  return [];
}

async function loadList(id: string) {
  if (!isUuid(id)) notFound();
  // A private list and a missing one look identical from outside.
  const list = await getPublicList(id);
  if (!list) notFound();
  return list;
}

function summary(titles: string[]) {
  if (titles.length === 0) return "An empty list, for now.";
  const named = titles.slice(0, 3).join(", ");
  return titles.length > 3 ? `${named} and ${titles.length - 3} more.` : `${named}.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const list = await loadList((await params).id);
  const count = list.items.length;
  const byline = list.ownerName ? ` picked by ${list.ownerName}` : "";
  const description = `${count} title${count === 1 ? "" : "s"}${byline}: ${summary(
    list.items.map((item) => item.title)
  )}`;
  const path = publicListPath(list.id);

  return {
    title: list.name,
    description,
    alternates: { canonical: path },
    // Shared for people, not for search: user-made lists can contain
    // anything, and a list made private again shouldn't linger in Google.
    // "follow" still lets crawlers reach the title pages it links to.
    robots: { index: false, follow: true },
    // The preview image comes from ./opengraph-image.tsx. openGraph replaces
    // the root layout's, so the shared fields are restated.
    openGraph: {
      type: "website",
      title: list.name,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: "en_US",
    },
    twitter: { card: "summary_large_image", title: list.name, description },
  };
}

export default async function PublicListPage({ params }: PageProps) {
  const list = await loadList((await params).id);
  const count = list.items.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-meta flex items-center gap-1.5 text-muted-foreground">
            <ListIcon className="size-3.5" />
            Shared watchlist
          </p>
          <h1 className="text-title mt-1 text-balance">{list.name}</h1>
          {list.description && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{list.description}</p>
          )}
          <p className="text-meta mt-2 text-muted-foreground">
            {count} title{count === 1 ? "" : "s"}
            {list.ownerName && <> · by {list.ownerName}</>}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <SaveCopyButton listId={list.id} />
          <ShareLinkButton path={publicListPath(list.id)} title={list.name} />
        </div>
      </div>

      {count === 0 ? (
        <EmptyState
          icon={ListIcon}
          title="Nothing here yet"
          description="The owner hasn't added any titles to this list."
        />
      ) : (
        <MediaGrid items={list.items} showType />
      )}
    </div>
  );
}
