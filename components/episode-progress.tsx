"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { CheckIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailSection } from "@/components/media-detail";
import {
  episodeLabel,
  nextEpisode,
  type EpisodeGuide,
  type EpisodeRef,
} from "@/lib/progress";

interface EpisodeProgressProps {
  type: "tv" | "anime";
  id: number;
  title: string;
  posterUrl: string | null;
  guide: EpisodeGuide;
}

/** How many episodes of a season can be picked: the ones that have aired. */
function pickableEpisodes(guide: EpisodeGuide, season: number, watched: EpisodeRef | null) {
  const count = guide.seasons.find((s) => s.number === season)?.episodes ?? Infinity;
  const aired = guide.lastAired?.season === season ? guide.lastAired.episode : Infinity;
  const max = Math.min(count, aired);
  // Neither a total nor a schedule: offer up to one past what's been watched.
  if (max === Infinity) return watched?.season === season ? watched.episode + 1 : 1;
  return max;
}

/**
 * "Which episode am I on" for a series or anime. The detail page around it is
 * cached and the same for everyone, so this, being personal, loads in the
 * browser (like the home page's recommendations).
 */
export function EpisodeProgress({ type, id, title, posterUrl, guide }: EpisodeProgressProps) {
  const { isLoaded, isSignedIn } = useAuth();
  // undefined while loading; null when nothing is watched yet.
  const [watched, setWatched] = useState<EpisodeRef | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [season, setSeason] = useState<number | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;
    const controller = new AbortController();
    fetch(`/api/progress/${type}/${id}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: { progress: EpisodeRef | null }) => setWatched(data.progress))
      .catch(() => {
        if (!controller.signal.aborted) setWatched(null);
      });
    return () => controller.abort();
  }, [isSignedIn, type, id]);

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return (
      <DetailSection title="Your progress">
        <p className="text-sm text-muted-foreground">
          <Link href="/sign-in" className="font-medium text-primary hover:opacity-80">
            Sign in
          </Link>{" "}
          to keep track of which episode you&apos;re on.
        </p>
      </DetailSection>
    );
  }

  if (watched === undefined) {
    return (
      <DetailSection title="Your progress">
        <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
      </DetailSection>
    );
  }

  const next = nextEpisode(guide, watched);
  // Seasons that haven't started airing can't have been watched.
  const seasons = guide.seasons.filter(
    (s) => !guide.lastAired || s.number <= guide.lastAired.season
  );
  const shownSeason = season ?? watched?.season ?? seasons[0]?.number ?? 1;
  const episodeCount = pickableEpisodes(guide, shownSeason, watched);

  async function save(target: EpisodeRef | null) {
    // Optimistic: show the new state now, put the old one back if the server
    // says no. Controls are disabled meanwhile, so requests can't overtake
    // each other and leave the server on an older value than the screen.
    const previous = watched ?? null;
    setWatched(target);
    setSaving(true);
    try {
      const res = target
        ? await fetch(`/api/progress/${type}/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...target, title, posterUrl }),
          })
        : await fetch(`/api/progress/${type}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setWatched(previous);
      toast.error("Couldn't save your progress");
    } finally {
      setSaving(false);
    }
  }

  const status =
    next.kind === "next"
      ? watched
        ? `Up next: ${episodeLabel(next, type)}`
        : "Not started"
      : next.kind === "waiting"
        ? "You're caught up. New episodes are on the way."
        : "You've finished it.";

  return (
    <DetailSection title="Your progress">
      <div className="flex flex-col gap-4 rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/5">
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">{status}</p>
          {watched && (
            <p className="text-meta text-muted-foreground">
              Watched up to {episodeLabel(watched, type)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {next.kind === "next" && (
            <Button size="sm" disabled={saving} onClick={() => save(next)}>
              <CheckIcon data-icon="inline-start" />
              Mark {episodeLabel(next, type)} watched
            </Button>
          )}

          {type === "tv" && seasons.length > 1 && (
            <Select
              value={String(shownSeason)}
              onValueChange={(value) => setSeason(Number(value))}
              disabled={saving}
            >
              <SelectTrigger size="sm" aria-label="Season">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {seasons.map((s) => (
                  <SelectItem key={s.number} value={String(s.number)}>
                    Season {s.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select
            // Empty when the picked season isn't the one in progress, so the
            // placeholder shows instead of an episode that isn't saved.
            value={watched?.season === shownSeason ? String(watched.episode) : ""}
            onValueChange={(value) => save({ season: shownSeason, episode: Number(value) })}
            disabled={saving}
          >
            <SelectTrigger size="sm" aria-label="Watched up to episode">
              <SelectValue placeholder="Watched up to…" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: episodeCount }, (_, i) => i + 1).map((episode) => (
                <SelectItem key={episode} value={String(episode)}>
                  Episode {episode}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {watched && (
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => save(null)}>
              <RotateCcwIcon data-icon="inline-start" />
              Reset
            </Button>
          )}
        </div>
      </div>
    </DetailSection>
  );
}
