import { notFound } from "next/navigation";
import { MediaGrid } from "@/components/media-grid";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
import { MediaHero, DetailSection, PersonRail } from "@/components/media-detail";
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

  const similarItems: MediaCardItem[] = (similar.results ?? []).slice(0, 12).map((t) => ({
    id: t.id,
    title: t.name,
    posterUrl: posterUrl(t.poster_path),
    year: t.first_air_date ? t.first_air_date.slice(0, 4) : null,
    rating: t.vote_average,
    type: "tv",
  }));

  const cast = credits.cast.slice(0, 16).map((person) => ({
    id: person.id,
    name: person.name,
    role: person.character,
    image: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null,
  }));

  const seasons = show.number_of_seasons
    ? `${show.number_of_seasons} season${show.number_of_seasons !== 1 ? "s" : ""}`
    : null;

  return (
    <div className="flex flex-col gap-12">
      <MediaHero
        title={show.name}
        subtitle={show.tagline}
        backdrop={backdropUrl(show.backdrop_path)}
        poster={posterUrl(show.poster_path, "w500")}
        rating={show.vote_average}
        meta={[
          show.first_air_date ? show.first_air_date.slice(0, 4) : null,
          seasons,
          show.number_of_episodes ? `${show.number_of_episodes} eps` : null,
          show.status,
        ]}
        genres={show.genres?.map((g) => g.name) ?? []}
        overview={show.overview}
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
