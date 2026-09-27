import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { MediaGrid } from "@/components/media-grid";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
import { TrailerButton } from "@/components/trailer-button";
import { WhereToWatch } from "@/components/where-to-watch";
import { MediaHero, DetailSection, PersonRail } from "@/components/media-detail";
import {
  getMovieDetails,
  getMovieCredits,
  getSimilarMovies,
  posterUrl,
  backdropUrl,
  pickTrailer,
} from "@/lib/tmdb";
import { absoluteUrl, mediaMetadata } from "@/lib/seo";
import type { MediaCardItem } from "@/components/media-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

// generateMetadata and the page both ask for the same movie. Next.js memoizes
// identical GET fetches within one request, so TMDB is only called once.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const movieId = Number((await params).id);
  const movie = isNaN(movieId) ? null : await getMovieDetails(movieId).catch(() => null);
  if (!movie) return {};

  return mediaMetadata({
    title: movie.title,
    year: movie.release_date ? movie.release_date.slice(0, 4) : null,
    description: movie.overview,
    path: `/media/movie/${movie.id}`,
    kind: "movie",
    images: [backdropUrl(movie.backdrop_path), posterUrl(movie.poster_path, "w500")],
  });
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

  const trailer = pickTrailer(movie.videos?.results);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    url: absoluteUrl(`/media/movie/${movie.id}`),
    image: posterUrl(movie.poster_path, "w500") ?? undefined,
    description: movie.overview || undefined,
    datePublished: movie.release_date || undefined,
    duration: movie.runtime ? `PT${movie.runtime}M` : undefined,
    genre: movie.genres?.map((g) => g.name),
    actor: cast.slice(0, 5).map((person) => ({ "@type": "Person", name: person.name })),
  };

  return (
    <div className="flex flex-col gap-12">
      <JsonLd data={jsonLd} />
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
        action={
          <>
            <AddToWatchlistButton item={cardItem} />
            {trailer && <TrailerButton videoKey={trailer.key} title={movie.title} />}
          </>
        }
      />

      <WhereToWatch providers={movie["watch/providers"]?.results} />

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
