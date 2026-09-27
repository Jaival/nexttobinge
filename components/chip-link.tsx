import Link from "next/link";
import { cn } from "@/lib/utils";

interface ChipLinkProps {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}

/**
 * A filter option that's a real link rather than a button with state: the
 * choice lives in the URL, so it survives a refresh, can be shared, and works
 * before any JavaScript has loaded.
 */
export function ChipLink({ href, active, children }: ChipLinkProps) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
        active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"
      )}
    >
      {children}
    </Link>
  );
}
