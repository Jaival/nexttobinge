import { notFound } from "next/navigation";
import { MediaGrid } from "@/components/media-grid";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
import { MediaHero, DetailSection, PersonRail } from "@/components/media-detail";
import {
  getMovieDetails,
  getMovieCredits,
  getSimilarMovies,
  posterUrl,
  backdropUrl,
} from "@/lib/tmdb";
import type { MediaCardItem } from "@/components/media-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { id } = await params;
  const movieId = Number(id);
  if (isNaN(movieId)) notFound();

  const [movie, credits, similar] = await Promise.all([
    getMovieDetails(movieId).catch(() => null),
    getMovieCredits(movieId).catch(() => ({ cast: [] })),
    getSimilarMovies(movieId).catch(() => ({ results: [] })),
  ]);

  if (!movie) notFound();

  const cardItem: MediaCardItem = {
    id: movie.id,
    title: movie.title,
    posterUrl: posterUrl(movie.poster_path),
    year: movie.release_date ? movie.release_date.slice(0, 4) : null,
    rating: movie.vote_average,
    type: "movie",
  };

  const similarItems: MediaCardItem[] = (similar.results ?? []).slice(0, 12).map((m) => ({
    id: m.id,
    title: m.title,
    posterUrl: posterUrl(m.poster_path),
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    rating: m.vote_average,
    type: "movie",
  }));

  const cast = credits.cast.slice(0, 16).map((person) => ({
    id: person.id,
    name: person.name,
    role: person.character,
    image: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null,
  }));

  return (
    <div className="flex flex-col gap-12">
      <MediaHero
        title={movie.title}
        subtitle={movie.tagline}
        backdrop={backdropUrl(movie.backdrop_path)}
        poster={posterUrl(movie.poster_path, "w500")}
        rating={movie.vote_average}
        meta={[
          movie.release_date ? movie.release_date.slice(0, 4) : null,
          movie.runtime ? `${movie.runtime} min` : null,
          movie.status,
        ]}
        genres={movie.genres?.map((g) => g.name) ?? []}
        overview={movie.overview}
        action={<AddToWatchlistButton item={cardItem} />}
      />

      {cast.length > 0 && (
        <DetailSection title="Cast">
          <PersonRail people={cast} />
        </DetailSection>
      )}

      {similarItems.length > 0 && (
        <DetailSection title="More like this">
          <MediaGrid items={similarItems} />
        </DetailSection>
      )}
    </div>
  );
}
