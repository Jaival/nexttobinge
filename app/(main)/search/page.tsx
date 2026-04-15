import { SearchIcon } from "lucide-react";
import { searchMovies, searchTV, posterUrl } from "@/lib/tmdb";
import { searchAnime, getAnimeTitle } from "@/lib/anilist";
import { MediaGrid } from "@/components/media-grid";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MediaCardItem } from "@/components/media-card";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <SearchIcon className="size-12 mb-4" />
        <p className="text-lg font-medium">Search for movies, dramas & anime</p>
        <p className="text-sm">Use the search bar above to find something to watch.</p>
      </div>
    );
  }

  const [moviesData, dramasData, animeData] = await Promise.all([
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

  const dramas: MediaCardItem[] = dramasData.results.map((t) => ({
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

  const total = movies.length + dramas.length + animes.length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">
          Results for &ldquo;{query}&rdquo;
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total} result{total !== 1 ? "s" : ""} found
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({total})</TabsTrigger>
          <TabsTrigger value="movies">Movies ({movies.length})</TabsTrigger>
          <TabsTrigger value="dramas">Dramas ({dramas.length})</TabsTrigger>
          <TabsTrigger value="anime">Anime ({animes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <MediaGrid items={[...movies, ...dramas, ...animes]} />
        </TabsContent>
        <TabsContent value="movies" className="mt-4">
          <MediaGrid items={movies} />
        </TabsContent>
        <TabsContent value="dramas" className="mt-4">
          <MediaGrid items={dramas} />
        </TabsContent>
        <TabsContent value="anime" className="mt-4">
          <MediaGrid items={animes} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
