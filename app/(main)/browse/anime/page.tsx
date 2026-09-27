import type { Metadata } from "next";
import { discoverAnime, getAnimeGenres } from "@/lib/anilist";
import { animeToCard } from "@/lib/media-cards";
import { browseMetadata } from "@/lib/seo";
import { animeFilters, parsePage } from "@/lib/browse-filters";
import { BrowsePageClient } from "@/components/browse-page-client";
import { BrowseFilters } from "@/components/browse-filters";
import { PageHeader } from "@/components/page-header";

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const { filtered } = animeFilters(await getAnimeGenres().catch(() => []), params);
  return browseMetadata(
    "/browse/anime",
    "Trending anime",
    "See the anime everyone is watching right now, then save the series you want to start to a watchlist.",
    parsePage(params.page),
    filtered
  );
}

export default async function AnimePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parsePage(params.page);
  const genres = await getAnimeGenres().catch(() => []);
  const { defs, values, discover } = animeFilters(genres, params);
  const data = await discoverAnime({ ...discover, page, perPage: 20 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Anime" description="What the AniList community is watching now." />
      <BrowseFilters defs={defs} values={values} />
      <BrowsePageClient
        items={data.media.map(animeToCard)}
        totalPages={data.pageInfo.lastPage}
        currentPage={page}
      />
    </div>
  );
}
