import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
import { TrailerButton } from "@/components/trailer-button";
import { AnimeStreamingLinks } from "@/components/where-to-watch";
import { MediaHero, DetailSection, PersonRail } from "@/components/media-detail";
import { MediaGrid } from "@/components/media-grid";
import { getAnimeDetails, getAnimeTitle, getAnimeDescription } from "@/lib/anilist";
import { absoluteUrl, mediaMetadata } from "@/lib/seo";
import type { MediaCardItem } from "@/components/media-card";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const animeId = Number((await params).id);
  const anime = isNaN(animeId) ? null : await getAnimeDetails(animeId).catch(() => null);
  if (!anime) return {};

  return mediaMetadata({
    title: getAnimeTitle(anime),
    year: anime.seasonYear ? String(anime.seasonYear) : null,
    description: getAnimeDescription(anime),
    path: `/media/anime/${anime.id}`,
    kind: anime.format === "MOVIE" ? "movie" : "tv",
    images: [anime.bannerImage, anime.coverImage.extraLarge],
  });
}

export default async function AnimeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const animeId = Number(id);
  if (isNaN(animeId)) notFound();

  const anime = await getAnimeDetails(animeId).catch(() => null);
  if (!anime) notFound();

  const title = getAnimeTitle(anime);

  const cardItem: MediaCardItem = {
    id: anime.id,
    title,
    posterUrl: anime.coverImage.extraLarge,
    year: anime.seasonYear ? String(anime.seasonYear) : null,
    rating: anime.averageScore,
    type: "anime",
  };

  const overview = getAnimeDescription(anime);

  const characters = anime.characters.nodes.map((char) => ({
    id: char.id,
    name: char.name.full,
    image: char.image.large,
  }));

  const related: MediaCardItem[] = anime.relations.edges.slice(0, 12).map(({ node }) => ({
    id: node.id,
    title: node.title.english ?? node.title.romaji,
    posterUrl: node.coverImage.large,
    year: null,
    rating: null,
    type: "anime",
  }));

  const studios = anime.studios.nodes.map((s) => s.name).join(", ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": anime.format === "MOVIE" ? "Movie" : "TVSeries",
    name: title,
    alternateName: [anime.title.romaji, anime.title.native].filter((t) => t && t !== title),
    url: absoluteUrl(`/media/anime/${anime.id}`),
    image: anime.coverImage.extraLarge,
    description: overview ?? undefined,
    genre: anime.genres,
    numberOfEpisodes: anime.format === "MOVIE" ? undefined : (anime.episodes ?? undefined),
    productionCompany: anime.studios.nodes.map((s) => ({ "@type": "Organization", name: s.name })),
  };

  return (
    <div className="flex flex-col gap-12">
      <JsonLd data={jsonLd} />
      <MediaHero
        title={title}
        subtitle={anime.title.native && title !== anime.title.native ? anime.title.native : null}
        backdrop={anime.bannerImage}
        poster={anime.coverImage.extraLarge}
        // AniList scores 0-100; MediaHero expects a 0-10 scale.
        rating={anime.averageScore ? anime.averageScore / 10 : null}
        meta={[
          anime.seasonYear ? String(anime.seasonYear) : null,
          anime.season,
          anime.episodes ? `${anime.episodes} eps` : null,
          anime.format,
          anime.status?.replace(/_/g, " "),
          studios || null,
        ]}
        genres={anime.genres ?? []}
        overview={overview}
        action={
          <>
            <AddToWatchlistButton item={cardItem} />
            {/* AniList trailers can also be on Dailymotion; only YouTube is embedded. */}
            {anime.trailer?.site === "youtube" && (
              <TrailerButton videoKey={anime.trailer.id} title={title} type="anime" />
            )}
          </>
        }
      />

      <AnimeStreamingLinks links={anime.externalLinks ?? []} />

      {characters.length > 0 && (
        <DetailSection title="Characters">
          <PersonRail people={characters} />
        </DetailSection>
      )}

      {related.length > 0 && (
        <DetailSection title="Related">
          <MediaGrid items={related} />
        </DetailSection>
      )}
    </div>
  );
}
