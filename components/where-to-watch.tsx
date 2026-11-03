import { ExternalLinkIcon } from "lucide-react";
import { DetailSection } from "@/components/media-detail";
import { WhereToWatchClient } from "@/components/where-to-watch-client";
import type { TMDBWatchProviders } from "@/lib/tmdb";
import type { AniListExternalLink } from "@/lib/anilist";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * Streaming, rental and purchase options for a movie or series. The visitor's
 * country isn't known here: reading it would make the page render per request,
 * so the client picks it. The server trims the TMDB response to what the UI
 * uses, since all of it is sent to the browser, and names every country so the
 * names match no matter the browser's ICU data.
 */
export function WhereToWatch({ providers = {} }: { providers?: TMDBWatchProviders }) {
  const trimmed: TMDBWatchProviders = {};
  for (const [code, entry] of Object.entries(providers)) {
    const pick = (list?: typeof entry.flatrate) =>
      list?.map(({ provider_id, provider_name, logo_path, display_priority }) => ({
        provider_id,
        provider_name,
        logo_path,
        display_priority,
      }));
    trimmed[code] = {
      link: entry.link,
      flatrate: pick(entry.flatrate),
      free: pick(entry.free),
      ads: pick(entry.ads),
      rent: pick(entry.rent),
      buy: pick(entry.buy),
    };
  }

  const countries = Object.keys(trimmed)
    .map((code) => ({ code, name: regionNames.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return <WhereToWatchClient providers={trimmed} countries={countries} />;
}

/**
 * AniList has no per-country catalogue, only the official streaming sites it
 * knows about. Better than nothing, and every link goes to a legal source.
 */
export function AnimeStreamingLinks({ links }: { links: AniListExternalLink[] }) {
  // Third-party data going into an href: only allow real web links, never
  // javascript: or data: URLs.
  const streaming = links.filter((l) => l.type === "STREAMING" && /^https?:\/\//.test(l.url));
  if (streaming.length === 0) return null;

  return (
    <DetailSection title="Where to watch">
      <ul className="flex flex-wrap gap-2">
        {streaming.map((link) => (
          <li key={link.id}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 hover:bg-accent"
            >
              {link.site}
              {link.language && (
                <span className="text-meta text-muted-foreground">{link.language}</span>
              )}
              <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Official sites listed on AniList. What each one carries depends on your country.
      </p>
    </DetailSection>
  );
}
