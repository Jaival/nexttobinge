import type { Metadata } from "next";
import Link from "next/link";
import { ShuffleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChipLink } from "@/components/chip-link";
import { MediaGrid } from "@/components/media-grid";
import { PageHeader } from "@/components/page-header";
import { MOODS, TYPES, getTonightPicks, type MoodId, type TonightOptions } from "@/lib/tonight";
import type { MediaType } from "@/components/media-card";

const TITLE = "What should I watch tonight?";
const DESCRIPTION =
  "Pick a mood and how much time you have, and get three movie, series or anime picks. Not feeling them? Shuffle.";

// Every combination of options is its own URL, but they're all the same page
// with different picks, so they share one canonical.
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tonight" },
};

interface PageProps {
  searchParams: Promise<{ mood?: string; type?: string; time?: string; seed?: string }>;
}

/** Search params are user input: anything unrecognised falls back to a default. */
function parseOptions(params: Awaited<PageProps["searchParams"]>): Partial<TonightOptions> & {
  type: MediaType;
  short: boolean;
  seed: number;
} {
  const mood = MOODS.find((m) => m.id === params.mood)?.id;
  const type = TYPES.find((t) => t.id === params.type)?.id ?? "movie";
  const seed = Number(params.seed);
  return {
    mood,
    type,
    short: params.time === "short",
    seed: Number.isInteger(seed) && seed >= 0 && seed < 1_000_000 ? seed : 0,
  };
}

function tonightHref(options: { mood?: MoodId; type: MediaType; short: boolean; seed?: number }) {
  const params = new URLSearchParams();
  if (options.mood) params.set("mood", options.mood);
  if (options.type !== "movie") params.set("type", options.type);
  if (options.short) params.set("time", "short");
  if (options.seed) params.set("seed", String(options.seed));
  const query = params.toString();
  return query ? `/tonight?${query}` : "/tonight";
}

function Step({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <h2 className="text-meta text-muted-foreground">{label}</h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default async function TonightPage({ searchParams }: PageProps) {
  const options = parseOptions(await searchParams);
  const { mood, type, short, seed } = options;
  const shortLabel = TYPES.find((t) => t.id === type)!.shortLabel;

  const picks = mood
    ? await getTonightPicks({ mood, type, short, seed }).catch(() => [])
    : null;

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title={TITLE} description="Tell us the vibe. We'll pick three." />

      <div className="flex flex-col gap-6">
        <Step label="I'm in the mood to…">
          {MOODS.map((m) => (
            // Changing any option starts from seed 0 again.
            <ChipLink key={m.id} href={tonightHref({ ...options, mood: m.id, seed: 0 })} active={m.id === mood}>
              {m.label}
            </ChipLink>
          ))}
        </Step>
        <Step label="Watching a…">
          {TYPES.map((t) => (
            <ChipLink key={t.id} href={tonightHref({ ...options, type: t.id, seed: 0 })} active={t.id === type}>
              {t.label}
            </ChipLink>
          ))}
        </Step>
        <Step label="Time">
          <ChipLink href={tonightHref({ ...options, short: false, seed: 0 })} active={!short}>
            No limit
          </ChipLink>
          <ChipLink href={tonightHref({ ...options, short: true, seed: 0 })} active={short}>
            {shortLabel}
          </ChipLink>
        </Step>
      </div>

      {picks && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-section">Tonight&apos;s picks</h2>
            {picks.length > 0 && (
              <Button asChild variant="secondary" size="sm">
                <Link href={tonightHref({ ...options, seed: seed + 1 })} scroll={false}>
                  <ShuffleIcon data-icon="inline-start" />
                  Shuffle
                </Link>
              </Button>
            )}
          </div>
          <MediaGrid
            items={picks}
            className="max-w-3xl grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3"
          />
        </section>
      )}
    </div>
  );
}
