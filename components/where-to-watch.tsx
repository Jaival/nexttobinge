import Image from "next/image";
import { ExternalLinkIcon } from "lucide-react";
import { DetailSection } from "@/components/media-detail";
import { CountrySelect } from "@/components/country-select";
import { getCountry } from "@/lib/country";
import { logoUrl, type TMDBWatchProvider, type TMDBWatchProviders } from "@/lib/tmdb";
import type { AniListExternalLink } from "@/lib/anilist";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryName(code: string) {
  return regionNames.of(code) ?? code;
}

/** Free and ad-supported services are still "stream", just cheaper. */
function uniqueProviders(...lists: (TMDBWatchProvider[] | undefined)[]) {
  const seen = new Map<number, TMDBWatchProvider>();
  for (const provider of lists.flat()) {
    if (provider && !seen.has(provider.provider_id)) seen.set(provider.provider_id, provider);
  }
  return [...seen.values()].sort((a, b) => a.display_priority - b.display_priority);
}

function ProviderRow({
  label,
  providers,
  link,
}: {
  label: string;
  providers: TMDBWatchProvider[];
  link: string;
}) {
  if (providers.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <p className="text-meta w-12 shrink-0 text-muted-foreground">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {providers.map((p) => (
          <li key={p.provider_id}>
            {/* TMDB's page for the title holds the per-service deep links;
                the API itself only says which services have it. */}
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              title={p.provider_name}
              className="relative block size-10 overflow-hidden rounded-lg ring-1 ring-foreground/10 transition-opacity duration-150 hover:opacity-80"
            >
              <Image src={logoUrl(p.logo_path)} alt={p.provider_name} fill sizes="40px" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Streaming, rental and purchase options for a movie or series, in the visitor's country. */
export async function WhereToWatch({ providers = {} }: { providers?: TMDBWatchProviders }) {
  const country = await getCountry();
  const here = providers[country];

  // Every country TMDB has data for, plus the current one so the picker can
  // show it even when it has no entry.
  const countries = [...new Set([country, ...Object.keys(providers)])]
    .map((code) => ({ code, name: countryName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const stream = uniqueProviders(here?.flatrate, here?.free, here?.ads);
  const rent = uniqueProviders(here?.rent);
  const buy = uniqueProviders(here?.buy);
  const available = stream.length + rent.length + buy.length > 0;

  return (
    <DetailSection
      title="Where to watch"
      action={<CountrySelect value={country} countries={countries} />}
    >
      {here && available ? (
        <div className="flex flex-col gap-3">
          <ProviderRow label="Stream" providers={stream} link={here.link} />
          <ProviderRow label="Rent" providers={rent} link={here.link} />
          <ProviderRow label="Buy" providers={buy} link={here.link} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not available to stream, rent or buy in {countryName(country)} yet.
        </p>
      )}
      {/* Required: TMDB's provider data is licensed from JustWatch. */}
      <p className="text-xs text-muted-foreground">
        Availability data from{" "}
        <a
          href="https://www.justwatch.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          JustWatch
        </a>
        .
      </p>
    </DetailSection>
  );
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
