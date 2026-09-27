"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FilterDef } from "@/lib/browse-filters";

// Radix Select can't use "" as an item value, so "no filter" needs a stand-in.
const ANY = "any";

interface BrowseFiltersProps {
  defs: FilterDef[];
  /** Current values, already validated on the server. */
  values: Record<string, string | undefined>;
}

/**
 * Holds no state of its own: every change is a navigation to a new URL, and
 * the server renders the filtered grid. The first "sort" option is the
 * default and stays out of the URL.
 */
export function BrowseFilters({ defs, values }: BrowseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function navigate(next: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    // No page param: a new filter starts again from page 1.
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  const filtered = Object.values(values).some(Boolean);

  return (
    <div
      aria-busy={pending}
      className={cn("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-60")}
    >
      {defs.map((def) => {
        const isSort = def.name === "sort";
        const fallback = isSort ? def.options[0].value : ANY;
        return (
          <Select
            key={def.name}
            value={values[def.name] ?? fallback}
            onValueChange={(value) =>
              navigate({ ...values, [def.name]: value === fallback ? undefined : value })
            }
          >
            <SelectTrigger size="sm" className="min-w-[7.5rem] text-xs" aria-label={def.label}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {!isSort && (
                <SelectItem value={ANY} className="text-xs">
                  Any {def.label.toLowerCase()}
                </SelectItem>
              )}
              {def.options.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      })}
      {filtered && (
        <Button variant="ghost" size="sm" onClick={() => navigate({})}>
          <XIcon data-icon="inline-start" />
          Clear
        </Button>
      )}
    </div>
  );
}
