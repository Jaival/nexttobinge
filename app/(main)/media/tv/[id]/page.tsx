import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { MediaGrid } from "@/components/media-grid";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
import { TrailerButton } from "@/components/trailer-button";
import { WhereToWatch } from "@/components/where-to-watch";
import { MediaHero, DetailSection, PersonRail } from "@/components/media-detail";
import {
  getTVDetails,
  getTVCredits,
  getSimilarTV,
  posterUrl,
  backdropUrl,
  pickTrailer,
} from "@/lib/tmdb";
import { absoluteUrl, mediaMetadata } from "@/lib/seo";
import type { MediaCardItem } from "@/components/media-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Shares the page's TMDB request: Next.js memoizes identical GET fetches.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const tvId = Number((await params).id);
  const show = isNaN(tvId) ? null : await getTVDetails(tvId).catch(() => null);
  if (!show) return {};

  return mediaMetadata({
    title: show.name,
    year: show.first_air_date ? show.first_air_date.slice(0, 4) : null,
    description: show.overview,
    path: `/media/tv/${show.id}`,
    kind: "tv",
    images: [backdropUrl(show.backdrop_path), posterUrl(show.poster_path, "w500")],
  });
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

  const trailer = pickTrailer(show.videos?.results);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TVSeries",
    name: show.name,
    url: absoluteUrl(`/media/tv/${show.id}`),
    image: posterUrl(show.poster_path, "w500") ?? undefined,
    description: show.overview || undefined,
    startDate: show.first_air_date || undefined,
    numberOfSeasons: show.number_of_seasons,
    numberOfEpisodes: show.number_of_episodes,
    genre: show.genres?.map((g) => g.name),
    actor: cast.slice(0, 5).map((person) => ({ "@type": "Person", name: person.name })),
  };

  return (
    <div className="flex flex-col gap-12">
      <JsonLd data={jsonLd} />
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
        action={
          <>
            <AddToWatchlistButton item={cardItem} />
            {trailer && <TrailerButton videoKey={trailer.key} title={show.name} />}
          </>
        }
      />

      <WhereToWatch providers={show["watch/providers"]?.results} />

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
