import type { Metadata } from "next";
import { discoverTV, getTVGenres } from "@/lib/tmdb";
import { tvToCard } from "@/lib/media-cards";
import { browseMetadata } from "@/lib/seo";
import { parsePage, tmdbFilters } from "@/lib/browse-filters";
import { BrowsePageClient } from "@/components/browse-page-client";
import { BrowseFilters } from "@/components/browse-filters";
import { PageHeader } from "@/components/page-header";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const { filtered } = tmdbFilters("tv", await getTVGenres().catch(() => []), params);
  return browseMetadata(
    "/browse/series",
    "Popular TV series",
    "Browse popular TV series and dramas, then save the ones you want to binge to a watchlist.",
    parsePage(params.page),
    filtered
  );
}

export default async function SeriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  // The genre list is one cached request, shared with generateMetadata.
  const genres = await getTVGenres().catch(() => []);
  const { defs, values, discover } = tmdbFilters("tv", genres, params);
  const data = await discoverTV({ ...discover, page: String(page) });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Series" description="Shows worth clearing an evening for." />
      <BrowseFilters defs={defs} values={values} />
      <BrowsePageClient
        items={data.results.map(tvToCard)}
        totalPages={data.total_pages}
        currentPage={page}
      />
    </div>
  );
}
