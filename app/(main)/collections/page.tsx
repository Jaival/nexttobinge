import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { COLLECTIONS, getCollectionItems } from "@/lib/collections";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Hand-picked lists of the best anime, K-dramas, sci-fi, horror and short movies, updated from TMDB and AniList.",
  alternates: { canonical: "/collections" },
};

const PREVIEW_COUNT = 4;

export default async function CollectionsPage() {
  // Same requests as the collection pages themselves, so they share one
  // cache entry each. A failing source costs a card its posters, nothing more.
  const previews = await Promise.all(
    COLLECTIONS.map((c) =>
      getCollectionItems(c)
        .then((items) => items.flatMap((item) => item.posterUrl ?? []).slice(0, PREVIEW_COUNT))
        .catch(() => [])
    )
  );

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Collections" description="Lists worth working through." />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COLLECTIONS.map((collection, i) => (
          <li
            key={collection.slug}
            className="relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border transition-shadow hover:shadow-md"
          >
            <div className="grid grid-cols-4 gap-px bg-muted">
              {Array.from({ length: PREVIEW_COUNT }).map((_, j) => {
                const poster = previews[i][j];
                return (
                  <div key={j} className="relative aspect-[2/3] bg-muted">
                    {poster && (
                      <Image src={poster} alt="" fill sizes="120px" className="object-cover" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-col gap-0.5 p-4">
              <Link
                href={`/collections/${collection.slug}`}
                className="text-sm font-medium tracking-[-0.01em] after:absolute after:inset-0 after:content-['']"
              >
                {collection.title}
              </Link>
              <p className="line-clamp-2 text-xs text-muted-foreground">{collection.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
