import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";

const LINKS = [
  { href: "/browse/movies", label: "Movies" },
  { href: "/browse/series", label: "Series" },
  { href: "/browse/anime", label: "Anime" },
  { href: "/collections", label: "Collections" },
  { href: "/tonight", label: "What to watch tonight" },
];

/**
 * Attribution is a condition of the APIs this site is built on. TMDB's terms
 * require its logo and this exact notice, with their logo less prominent
 * than ours. AniList and JustWatch (via TMDB) are credited alongside.
 *
 * The links double as crawl paths: every page now links to every section.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              Find movies, series and anime worth your evening, and keep them in one watchlist.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-1">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Image
                src="/tmdb-logo.svg"
                alt="TMDB"
                width={92}
                height={12}
                unoptimized
                className="h-3 w-auto"
              />
            </a>
            <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
          </div>
          <p className="shrink-0">
            Anime data from{" "}
            <a
              href="https://anilist.co"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              AniList
            </a>
            . Streaming availability from JustWatch.
          </p>
        </div>
      </div>
    </footer>
  );
}
