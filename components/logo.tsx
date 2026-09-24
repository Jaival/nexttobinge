import { cn } from "@/lib/utils";

/**
 * The mark is a "play next" glyph: the play triangle is the watching, the bar
 * is the "next". It sits on a primary → brand tile, so it follows whichever
 * palette is active without any per-palette artwork. app/icon.svg is the same
 * drawing with the violet values baked in for the favicon.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-[30%] bg-linear-to-br from-primary to-brand text-primary-foreground shadow-sm ring-1 ring-inset ring-white/15",
        className
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[62%]" fill="currentColor">
        <path
          d="M6.5 6.2v11.6a.8.8 0 0 0 1.2.7l8.9-5.8a.8.8 0 0 0 0-1.4L7.7 5.5a.8.8 0 0 0-1.2.7Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <rect x="17.25" y="5.25" width="2.75" height="13.5" rx="1.375" />
      </svg>
    </span>
  );
}

/** Mark plus wordmark. "to" is quieter so the name reads as three words. */
export function Logo({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span
        className={cn("text-[15px] font-semibold tracking-[-0.02em]", wordmarkClassName)}
      >
        Next<span className="font-medium text-muted-foreground">to</span>Binge
      </span>
    </span>
  );
}
