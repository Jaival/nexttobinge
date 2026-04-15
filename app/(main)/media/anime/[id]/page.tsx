import { notFound } from "next/navigation";
import Image from "next/image";
import { StarIcon, CalendarIcon, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AddToWatchlistButton } from "@/components/add-to-watchlist-button";
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

  const cleanDescription = anime.description
    ? anime.description.replace(/<[^>]+>/g, "")
    : null;

  return (
    <div className="flex flex-col gap-8">
      {anime.bannerImage && (
        <div className="relative -mx-4 -mt-6 h-64 overflow-hidden sm:-mx-6 sm:h-80 md:h-96">
          <Image src={anime.bannerImage} alt={title} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row">
        <div className="relative mx-auto aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-xl shadow-md sm:mx-0 sm:w-48">
          <Image src={anime.coverImage.extraLarge} alt={title} fill className="object-cover" />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-semibold sm:text-3xl">{title}</h1>
            {anime.title.native && title !== anime.title.native && (
              <p className="text-sm text-muted-foreground">{anime.title.native}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {anime.seasonYear && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <CalendarIcon className="size-3.5" />
                  {anime.seasonYear}
                  {anime.season ? ` · ${anime.season}` : ""}
                </span>
              )}
              {anime.episodes && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <SparklesIcon className="size-3.5" />
                  {anime.episodes} episodes
                </span>
              )}
              {anime.averageScore && (
                <span className="flex items-center gap-1 text-sm text-yellow-500">
                  <StarIcon className="size-3.5 fill-yellow-500" />
                  {(anime.averageScore / 10).toFixed(1)}
                </span>
              )}
              {anime.status && (
                <Badge variant="secondary">{anime.status.replace(/_/g, " ")}</Badge>
              )}
              {anime.format && (
                <Badge variant="outline">{anime.format}</Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {anime.genres?.map((g) => (
                <Badge key={g} variant="outline">
                  {g}
                </Badge>
              ))}
            </div>
            {anime.studios.nodes.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Studio: {anime.studios.nodes.map((s) => s.name).join(", ")}
              </p>
            )}
          </div>

          {cleanDescription && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground line-clamp-6">
              {cleanDescription}
            </p>
          )}

          <AddToWatchlistButton item={cardItem} />
        </div>
      </div>

      {anime.characters.nodes.length > 0 && (
        <>
          <Separator />
          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-lg font-semibold">Characters</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {anime.characters.nodes.map((char) => (
                <div key={char.id} className="flex w-20 shrink-0 flex-col items-center gap-1 text-center">
                  <div className="relative size-16 overflow-hidden rounded-full bg-muted">
                    {char.image.large ? (
                      <Image
                        src={char.image.large}
                        alt={char.name.full}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        {char.name.full.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium leading-tight line-clamp-2">{char.name.full}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {anime.relations.edges.length > 0 && (
        <>
          <Separator />
          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-lg font-semibold">Related</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {anime.relations.edges.slice(0, 5).map(({ node, relationType }) => (
                <div key={node.id} className="flex flex-col gap-1">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                    <Image src={node.coverImage.large} alt={node.title.english ?? node.title.romaji} fill className="object-cover" />
                  </div>
                  <p className="text-xs font-medium line-clamp-2">
                    {node.title.english ?? node.title.romaji}
                  </p>
                  <Badge variant="secondary" className="text-[10px] w-fit px-1.5 py-0">
                    {relationType.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
