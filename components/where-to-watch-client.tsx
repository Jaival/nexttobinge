"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { DetailSection } from "@/components/media-detail";
import { CountrySelect } from "@/components/country-select";
import { Skeleton } from "@/components/ui/skeleton";
import { COUNTRY_COOKIE, FALLBACK_COUNTRY, isCountryCode } from "@/lib/country";
import { logoUrl, type TMDBWatchProvider, type TMDBWatchProviders } from "@/lib/tmdb";

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

interface WhereToWatchClientProps {
  providers: TMDBWatchProviders;
  /** Every country TMDB has data for, named on the server. */
  countries: { code: string; name: string }[];
}

/**
 * The country is only known in the browser (the page itself is cached for
 * everyone), so the section shows a skeleton until it is: the saved cookie, or
 * one request to /api/country, which saves it.
 */
export function WhereToWatchClient({ providers, countries }: WhereToWatchClientProps) {
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    const saved = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${COUNTRY_COOKIE}=`))
      ?.slice(COUNTRY_COOKIE.length + 1);
    const known = isCountryCode(saved)
      ? Promise.resolve(saved)
      : fetch("/api/country")
          .then((res) => res.json() as Promise<{ country: string }>)
          .then((data) => data.country)
          // Offline or blocked: show the fallback rather than a skeleton forever.
          .catch(() => FALLBACK_COUNTRY);
    known.then(setCountry);
  }, []);

  if (!country) {
    return (
      <DetailSection title="Where to watch">
        <Skeleton className="h-10 w-full max-w-sm" />
        <JustWatchCredit />
      </DetailSection>
    );
  }

  const regionName = (code: string) =>
    countries.find((c) => c.code === code)?.name ?? new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;

  // TMDB may have no entry for the current country; the picker still lists it.
  const options = countries.some((c) => c.code === country)
    ? countries
    : [...countries, { code: country, name: regionName(country) }].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

  const here = providers[country];
  const stream = uniqueProviders(here?.flatrate, here?.free, here?.ads);
  const rent = uniqueProviders(here?.rent);
  const buy = uniqueProviders(here?.buy);
  const available = stream.length + rent.length + buy.length > 0;

  return (
    <DetailSection
      title="Where to watch"
      action={<CountrySelect value={country} countries={options} onChange={setCountry} />}
    >
      {here && available ? (
        <div className="flex flex-col gap-3">
          <ProviderRow label="Stream" providers={stream} link={here.link} />
          <ProviderRow label="Rent" providers={rent} link={here.link} />
          <ProviderRow label="Buy" providers={buy} link={here.link} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Not available to stream, rent or buy in {regionName(country)} yet.
        </p>
      )}
      <JustWatchCredit />
    </DetailSection>
  );
}

/** Required: TMDB's provider data is licensed from JustWatch. */
function JustWatchCredit() {
  return (
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
  );
}
