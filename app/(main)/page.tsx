import Link from "next/link";
import { FilmIcon, TvIcon, SparklesIcon, ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaGrid } from "@/components/media-grid";
import {
  getTrendingMovies,
  getTrendingTV,
  posterUrl,
  type TMDBMovie,
  type TMDBTVShow,
} from "@/lib/tmdb";
import { getTrendingAnime, getAnimeTitle, type AniListMedia } from "@/lib/anilist";
import type { MediaCardItem } from "@/components/media-card";

function movieToCard(m: TMDBMovie): MediaCardItem {
  return {
    id: m.id,
    title: m.title,
    posterUrl: posterUrl(m.poster_path),
    year: m.release_date ? m.release_date.slice(0, 4) : null,
    rating: m.vote_average,
    type: "movie",
  };
}

function tvToCard(t: TMDBTVShow): MediaCardItem {
  return {
    id: t.id,
    title: t.name,
    posterUrl: posterUrl(t.poster_path),
    year: t.first_air_date ? t.first_air_date.slice(0, 4) : null,
    rating: t.vote_average,
    type: "tv",
  };
}

function animeToCard(a: AniListMedia): MediaCardItem {
  return {
    id: a.id,
    title: getAnimeTitle(a),
    posterUrl: a.coverImage.extraLarge,
    year: a.seasonYear ? String(a.seasonYear) : null,
    rating: a.averageScore,
    type: "anime",
  };
}

const SECTIONS = [
  {
    id: "movies",
    title: "Trending Movies",
    href: "/browse/movies",
    icon: FilmIcon,
  },
  {
    id: "dramas",
    title: "Trending Dramas",
    href: "/browse/dramas",
    icon: TvIcon,
  },
  {
    id: "anime",
    title: "Trending Anime",
    href: "/browse/anime",
    icon: SparklesIcon,
  },
];

export default async function HomePage() {
  const [moviesData, dramasData, animeData] = await Promise.all([
    getTrendingMovies(),
    getTrendingTV(),
    getTrendingAnime(1, 10),
  ]);

  const movies = moviesData.results.slice(0, 10).map(movieToCard);
  const dramas = dramasData.results.slice(0, 10).map(tvToCard);
  const animes = animeData.media.slice(0, 10).map(animeToCard);

  const allItems = { movies, dramas, anime: animes };

  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col gap-3 pt-4">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Discover Your Next Binge
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Browse trending movies, dramas, and anime. Save your favourites into personal watchlists.
        </p>
      </section>

      {SECTIONS.map(({ id, title, href, icon: Icon }) => {
        const items = allItems[id as keyof typeof allItems];
        return (
          <section key={id} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="size-5 text-primary" />
                <h2 className="font-heading text-xl font-semibold">{title}</h2>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={href} className="flex items-center gap-1">
                  View all
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
            </div>
            <MediaGrid items={items} />
          </section>
        );
      })}
    </div>
  );
}
