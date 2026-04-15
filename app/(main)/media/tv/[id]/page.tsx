import { notFound } from "next/navigation";
import Image from "next/image";
import { StarIcon, CalendarIcon, TvIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MediaGrid } from "@/components/media-grid";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
import {
  getTVDetails,
  getTVCredits,
  getSimilarTV,
  posterUrl,
  backdropUrl,
} from "@/lib/tmdb";
import type { MediaCardItem } from "@/components/media-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TVDetailPage({ params }: PageProps) {
  const { id } = await params;
  const tvId = Number(id);
  if (isNaN(tvId)) notFound();

  const [show, credits, similar] = await Promise.all([
    getTVDetails(tvId).catch(() => null),
    getTVCredits(tvId).catch(() => ({ cast: [] })),
    getSimilarTV(tvId).catch(() => ({ results: [] })),
  ]);

  if (!show) notFound();

  const cardItem: MediaCardItem = {
    id: show.id,
    title: show.name,
    posterUrl: posterUrl(show.poster_path),
    year: show.first_air_date ? show.first_air_date.slice(0, 4) : null,
    rating: show.vote_average,
    type: "tv",
  };

  const similarItems: MediaCardItem[] = (similar.results ?? []).slice(0, 10).map((t) => ({
    id: t.id,
    title: t.name,
    posterUrl: posterUrl(t.poster_path),
    year: t.first_air_date ? t.first_air_date.slice(0, 4) : null,
    rating: t.vote_average,
    type: "tv",
  }));

  const backdrop = backdropUrl(show.backdrop_path);
  const poster = posterUrl(show.poster_path, "w500");

  return (
    <div className="flex flex-col gap-8">
      {backdrop && (
        <div className="relative -mx-4 -mt-6 h-64 overflow-hidden sm:-mx-6 sm:h-80 md:h-96">
          <Image src={backdrop} alt={show.name} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row">
        {poster && (
          <div className="relative mx-auto aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl shadow-md sm:mx-0 sm:w-48">
            <Image src={poster} alt={show.name} fill className="object-cover" />
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{show.name}</h1>
            {show.tagline && (
              <p className="text-sm italic text-muted-foreground">{show.tagline}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {show.first_air_date && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CalendarIcon className="size-3.5" />
                  {show.first_air_date.slice(0, 4)}
                </span>
              )}
              {show.number_of_seasons && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <TvIcon className="size-3.5" />
                  {show.number_of_seasons} season{show.number_of_seasons !== 1 ? "s" : ""}
                  {show.number_of_episodes ? ` · ${show.number_of_episodes} eps` : ""}
                </span>
              )}
              {show.vote_average > 0 && (
                <span className="flex items-center gap-1 text-sm text-yellow-500">
                  <StarIcon className="size-3.5 fill-yellow-500" />
                  {show.vote_average.toFixed(1)}
                </span>
              )}
              {show.status && (
                <Badge variant="secondary">{show.status}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {show.genres?.map((g) => (
                <Badge key={g.id} variant="outline">
                  {g.name}
                </Badge>
              ))}
            </div>
          </div>

          {show.overview && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {show.overview}
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
            <h2 className="font-heading text-lg font-semibold">Similar Dramas</h2>
            <MediaGrid items={similarItems} />
          </section>
        </>
      )}
    </div>
  );
}
