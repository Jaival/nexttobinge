import type { Metadata } from "next";
import Link from "next/link";
import {
  FilmIcon,
  TvIcon,
  SparklesIcon,
  ArrowRightIcon,
  DicesIcon,
  LibraryIcon,
} from "lucide-react";
import { MediaGrid } from "@/components/media-grid";
import { Recommendations } from "@/components/recommendations";
import { getTrendingMovies, getTrendingTV } from "@/lib/tmdb";
import { getTrendingAnime } from "@/lib/anilist";
import { animeToCard, movieToCard, tvToCard } from "@/lib/media-cards";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

// Canonical lives here, not in the root layout, which every page inherits.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Tells Google the site's name for the "site name" line above search results.
const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: `${SITE_URL}/`,
};

const SECTIONS = [
  { id: "movies", title: "Trending movies", href: "/browse/movies" },
  { id: "series", title: "Trending series", href: "/browse/series" },
  { id: "anime", title: "Trending anime", href: "/browse/anime" },
] as const;

const HERO_LINKS = [
  { href: "/browse/movies", icon: FilmIcon, label: "Movies" },
  { href: "/browse/series", icon: TvIcon, label: "Series" },
  { href: "/browse/anime", icon: SparklesIcon, label: "Anime" },
  { href: "/tonight", icon: DicesIcon, label: "Pick for me" },
  { href: "/collections", icon: LibraryIcon, label: "Collections" },
];

export default async function HomePage() {
  const [moviesData, seriesData, animeData] = await Promise.all([
    getTrendingMovies(),
    getTrendingTV(),
    getTrendingAnime(1, 12),
  ]);

  const allItems = {
    movies: moviesData.results.slice(0, 12).map(movieToCard),
    series: seriesData.results.slice(0, 12).map(tvToCard),
    anime: animeData.media.slice(0, 12).map(animeToCard),
  };

  return (
    <div className="flex flex-col gap-14">
      <JsonLd data={WEBSITE_JSON_LD} />
      {/* One focal moment, then straight into content. DESIGN.md §7 */}
      <section className="relative isolate -mx-4 overflow-hidden px-4 pb-2 pt-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, var(--brand) 0%, var(--primary) 45%, transparent 70%)",
          }}
        />
        <h1 className="text-display max-w-2xl text-balance">Find your next binge.</h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground">
          Trending movies, series and anime in one place. Save anything to a personal watchlist.
        </p>
        <div className="rail mt-6 gap-2">
          {HERO_LINKS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-accent"
            >
              <Icon className="size-3.5 text-primary" />
              {label}
            </Link>
          ))}
        </div>
      </section>

      <Recommendations />

      {SECTIONS.map(({ id, title, href }) => (
        <section key={id} className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-section">{title}</h2>
            <Link
              href={href}
              className="group flex shrink-0 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              View all
              <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
          <MediaGrid items={allItems[id]} />
        </section>
      ))}
    </div>
  );
}
