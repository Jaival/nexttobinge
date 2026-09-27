"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { ThemeControls } from "@/components/theme-controls";
import {
  SearchIcon,
  TvIcon,
  FilmIcon,
  SparklesIcon,
  ListIcon,
  LibraryIcon,
  DicesIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { href: "/browse/movies", label: "Movies", icon: FilmIcon },
  { href: "/browse/series", label: "Series", icon: TvIcon },
  { href: "/browse/anime", label: "Anime", icon: SparklesIcon },
  { href: "/collections", label: "Collections", icon: LibraryIcon },
  { href: "/tonight", label: "Tonight", icon: DicesIcon },
  { href: "/watchlists", label: "Watchlists", icon: ListIcon },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);

  // Scroll-edge effect: the divider appears only once content is underneath,
  // instead of a permanent 1px line. DESIGN.md §4.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <header
      data-scrolled={scrolled}
      className="chrome-layer sticky top-0 z-50"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Link href="/" aria-label="NextToBinge home" className="shrink-0">
          <Logo wordmarkClassName="hidden sm:block" />
        </Link>

        {/* Six links plus search need about 1000px, so tablets get the rail below. */}
        <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname?.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // Core navigation, 100+/day tier: colour only, no movement.
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <form onSubmit={handleSearch} className="ml-auto flex min-w-0 flex-1 justify-end">
          <div className="relative w-full max-w-xs">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="Search movies, series and anime"
              className="h-9 rounded-full border-transparent bg-muted pl-9 shadow-none focus-visible:border-ring"
            />
          </div>
        </form>

        <ThemeControls className="shrink-0" />

        {/* Modal, not redirect: signing in shouldn't lose the page you were on. */}
        <Show when="signed-out">
          <div className="flex shrink-0 items-center gap-1.5">
            <SignInButton mode="modal">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button size="sm" className="hidden rounded-full px-3.5 sm:inline-flex">
                Sign up
              </Button>
            </SignUpButton>
          </div>
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>

      <nav className="rail gap-1 px-4 pb-2 sm:px-6 lg:hidden">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
