import type { Metadata } from "next";

// Watchlists are private and sit behind sign-in, so there is nothing for a
// search engine to index. robots.txt also asks crawlers to skip /watchlists.
export const metadata: Metadata = {
  title: "Your watchlists",
  robots: { index: false, follow: false },
};

export default function WatchlistsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
