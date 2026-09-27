import type { Metadata } from "next";
import { SearchIcon } from "lucide-react";
import { searchMovies, searchTV, posterUrl } from "@/lib/tmdb";
import { searchAnime, getAnimeTitle } from "@/lib/anilist";
import { MediaGrid } from "@/components/media-grid";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MediaCardItem } from "@/components/media-card";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

// Result pages are thin, near-duplicate, and there are infinitely many of them,
// so they stay out of the index. "follow" still lets crawlers reach the titles
// they link to. This is a meta tag rather than a robots.txt rule on purpose:
// a crawler blocked by robots.txt never sees the noindex.
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const query = (await searchParams).q?.trim();
  return {
    title: query ? `Search: ${query}` : "Search",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  if (!query) {
    return (
      <EmptyState
        icon={SearchIcon}
        title="Search for something to watch"
        description="Movies, series and anime. Use the search bar above to start."
      />
    );
  }

  const [moviesData, seriesData, animeData] = await Promise.all([
    searchMovies(query),
    searchTV(query),
    searchAnime(query),
  ]);

  const movies: MediaCardItem[] = moviesData.results.map((m) => ({
    id: m.id,
    title: m.title,
    posterUrl: posterUrl(m.poster_path),
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    rating: m.vote_average,
    type: "movie",
  }));

  const series: MediaCardItem[] = seriesData.results.map((t) => ({
    id: t.id,
    title: t.name,
    posterUrl: posterUrl(t.poster_path),
    year: t.first_air_date ? t.first_air_date.slice(0, 4) : null,
    rating: t.vote_average,
    type: "tv",
  }));

  const animes: MediaCardItem[] = animeData.media.map((a) => ({
    id: a.id,
    title: getAnimeTitle(a),
    posterUrl: a.coverImage.extraLarge,
    year: a.seasonYear ? String(a.seasonYear) : null,
    rating: a.averageScore,
    type: "anime",
  }));

  const total = movies.length + series.length + animes.length;

  const TABS = [
    { value: "all", label: "All", items: [...movies, ...series, ...animes], mixed: true },
    { value: "movies", label: "Movies", items: movies, mixed: false },
    { value: "series", label: "Series", items: series, mixed: false },
    { value: "anime", label: "Anime", items: animes, mixed: false },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={`Results for “${query}”`}
        description={`${total} result${total !== 1 ? "s" : ""} found`}
      />

      {/* Content swaps instantly: tab switching is core navigation, and motion
          here would only add latency. DESIGN.md §5 "What deliberately does not animate" */}
      <Tabs defaultValue="all">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
              <span className="text-meta ml-1.5 text-muted-foreground">{tab.items.length}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            <MediaGrid items={tab.items} showType={tab.mixed} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
