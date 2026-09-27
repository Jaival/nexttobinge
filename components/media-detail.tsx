import Image from "next/image";
import { StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Full-bleed out of the page container, then padded back in. */
const BLEED = "-mx-4 sm:-mx-6 lg:-mx-8";
const INSET = "px-4 sm:px-6 lg:px-8";

interface MediaHeroProps {
  title: string;
  subtitle?: string | null;
  backdrop?: string | null;
  poster?: string | null;
  /** Short factual strings — year, runtime, episode count. Rendered in mono. */
  meta?: (string | null | undefined)[];
  /** Already normalised to a 0-10 scale. */
  rating?: number | null;
  genres?: string[];
  overview?: string | null;
  action?: React.ReactNode;
}

export function MediaHero({
  title,
  subtitle,
  backdrop,
  poster,
  meta = [],
  rating,
  genres = [],
  overview,
  action,
}: MediaHeroProps) {
  const facts = meta.filter(Boolean) as string[];

  return (
    <section className={cn(BLEED, "-mt-6")}>
      {backdrop ? (
        <div className="relative h-[clamp(11rem,34vh,20rem)] overflow-hidden">
          <Image
            src={backdrop}
            alt=""
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          {/* Two stops so the poster below sits on solid background, not on a
              half-faded image where text legibility is unpredictable. */}
          <div className="absolute inset-0 bg-linear-to-t from-background via-background/75 to-background/20" />
        </div>
      ) : (
        <div className="h-6" />
      )}

      <div
        className={cn(
          INSET,
          // relative: without it the backdrop above, which is positioned,
          // paints over the title where the negative margin overlaps it.
          "relative mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:gap-8",
          backdrop && "-mt-20 sm:-mt-24"
        )}
      >
        {poster && (
          <div className="relative mx-auto aspect-[2/3] w-32 shrink-0 overflow-hidden rounded-xl bg-muted shadow-lg ring-1 ring-foreground/10 sm:mx-0 sm:w-44">
            <Image src={poster} alt="" fill sizes="176px" className="object-cover" />
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-4 pt-1">
          <div className="flex flex-col gap-2">
            <h1 className="text-title text-balance sm:text-[2rem]">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

            {(facts.length > 0 || rating != null) && (
              <div className="text-meta flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                {rating != null && rating > 0 && (
                  <>
                    <span className="flex items-center gap-1 text-foreground">
                      <StarIcon className="size-3 fill-rating text-rating" />
                      {rating.toFixed(1)}
                    </span>
                    {facts.length > 0 && <span aria-hidden>·</span>}
                  </>
                )}
                {facts.map((fact, i) => (
                  <span key={fact} className="flex items-center gap-2">
                    {fact}
                    {i < facts.length - 1 && <span aria-hidden>·</span>}
                  </span>
                ))}
              </div>
            )}

            {genres.length > 0 && (
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {genres.map((genre) => (
                  <li
                    key={genre}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {genre}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {overview && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {overview}
            </p>
          )}

          {action && <div className="flex flex-wrap gap-2 pt-1">{action}</div>}
        </div>
      </div>
    </section>
  );
}

export function DetailSection({
  title,
  action,
  children,
}: {
  title: string;
  /** Rendered at the right end of the heading row. */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-section">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export interface Person {
  id: number | string;
  name: string;
  role?: string | null;
  image?: string | null;
}

/** Horizontal rail — snaps, and does not chain scroll out to back-navigation. */
export function PersonRail({ people }: { people: Person[] }) {
  return (
    <ul className="rail gap-4 pb-1">
      {people.map((person) => (
        <li key={person.id} className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center">
          <div className="relative size-[4.5rem] overflow-hidden rounded-full bg-muted ring-1 ring-foreground/10">
            {person.image ? (
              <Image src={person.image} alt="" fill sizes="72px" className="object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-sm font-medium text-muted-foreground">
                {person.name.charAt(0)}
              </span>
            )}
          </div>
          <p className="line-clamp-2 text-xs font-medium leading-tight">{person.name}</p>
          {person.role && (
            <p className="line-clamp-1 text-[11px] text-muted-foreground">{person.role}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
