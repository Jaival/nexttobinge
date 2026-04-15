import { FilmIcon } from "lucide-react";
import { discoverMovies, posterUrl } from "@/lib/tmdb";
import { BrowsePageClient } from "@/components/browse-page-client";
import type { MediaCardItem } from "@/components/media-card";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function MoviesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = String(Math.max(1, Number(params.page ?? 1)));
  const data = await discoverMovies({ page });

  const items: MediaCardItem[] = data.results.map((m) => ({
    id: m.id,
    title: m.title,
    posterUrl: posterUrl(m.poster_path),
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    rating: m.vote_average,
    type: "movie",
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <FilmIcon className="size-6 text-primary" />
        <h1 className="font-heading text-2xl font-semibold">Movies</h1>
      </div>
      <BrowsePageClient items={items} totalPages={data.total_pages} currentPage={Number(page)} />
    </div>
  );
}
