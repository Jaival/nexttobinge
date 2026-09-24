import { notFound } from "next/navigation";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
import { MediaHero, DetailSection, PersonRail } from "@/components/media-detail";
import { MediaGrid } from "@/components/media-grid";
import { getAnimeDetails, getAnimeTitle } from "@/lib/anilist";
import type { MediaCardItem } from "@/components/media-card";

interface PageProps {
  params: Promise<{ id: string }>;
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

  // AniList descriptions carry inline HTML.
  const overview = anime.description
    ? anime.description.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")
    : null;

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

  return (
    <div className="flex flex-col gap-12">
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
        action={<AddToWatchlistButton item={cardItem} />}
      />

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
