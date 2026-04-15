import { notFound } from "next/navigation";
import Image from "next/image";
import { StarIcon, ClockIcon, CalendarIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MediaGrid } from "@/components/media-grid";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
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

  const similarItems: MediaCardItem[] = (similar.results ?? []).slice(0, 10).map((m) => ({
    id: m.id,
    title: m.title,
    posterUrl: posterUrl(m.poster_path),
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    rating: m.vote_average,
    type: "movie",
  }));

  const backdrop = backdropUrl(movie.backdrop_path);
  const poster = posterUrl(movie.poster_path, "w500");

  return (
    <div className="flex flex-col gap-8">
      {backdrop && (
        <div className="relative -mx-4 -mt-6 h-64 overflow-hidden sm:-mx-6 sm:h-80 md:h-96">
          <Image src={backdrop} alt={movie.title} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row">
        {poster && (
          <div className="relative mx-auto aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl shadow-md sm:mx-0 sm:w-48">
            <Image src={poster} alt={movie.title} fill className="object-cover" />
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{movie.title}</h1>
            {movie.tagline && (
              <p className="text-sm italic text-muted-foreground">{movie.tagline}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {movie.release_date && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CalendarIcon className="size-3.5" />
                  {movie.release_date.slice(0, 4)}
                </span>
              )}
              {movie.runtime && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <ClockIcon className="size-3.5" />
                  {movie.runtime}m
                </span>
              )}
              {movie.vote_average > 0 && (
                <span className="flex items-center gap-1 text-sm text-yellow-500">
                  <StarIcon className="size-3.5 fill-yellow-500" />
                  {movie.vote_average.toFixed(1)}
                </span>
              )}
              {movie.status && (
                <Badge variant="secondary">{movie.status}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {movie.genres?.map((g) => (
                <Badge key={g.id} variant="outline">
                  {g.name}
                </Badge>
              ))}
            </div>
          </div>

          {movie.overview && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {movie.overview}
            </p>
          )}

          <AddToWatchlistButton item={cardItem} />
        </div>
      </div>

      {credits.cast.length > 0 && (
        <>
          <Separator />
          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-lg font-semibold">Cast</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {credits.cast.slice(0, 12).map((person) => (
                <div key={person.id} className="flex w-20 shrink-0 flex-col items-center gap-1 text-center">
                  <div className="relative size-16 overflow-hidden rounded-full bg-muted">
                    {person.profile_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                        alt={person.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        {person.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium leading-tight line-clamp-2">{person.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{person.character}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {similarItems.length > 0 && (
        <>
          <Separator />
          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-lg font-semibold">Similar Movies</h2>
            <MediaGrid items={similarItems} />
          </section>
        </>
      )}
    </div>
  );
}
