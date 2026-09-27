import type { Metadata } from "next";
import { discoverMovies, getMovieGenres } from "@/lib/tmdb";
import { movieToCard } from "@/lib/media-cards";
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
  const { filtered } = tmdbFilters("movie", await getMovieGenres().catch(() => []), params);
  return browseMetadata(
    "/browse/movies",
    "Popular movies",
    "Browse popular and highly rated movies, then save the ones you want to watch to a watchlist.",
    parsePage(params.page),
    filtered
  );
}

export default async function MoviesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  // The genre list is one cached request, shared with generateMetadata.
  const genres = await getMovieGenres().catch(() => []);
  const { defs, values, discover } = tmdbFilters("movie", genres, params);
  const data = await discoverMovies({ ...discover, page: String(page) });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Movies" description="Popular and highly rated films." />
      <BrowseFilters defs={defs} values={values} />
      <BrowsePageClient
        items={data.results.map(movieToCard)}
        totalPages={data.total_pages}
        currentPage={page}
      />
    </div>
  );
}
