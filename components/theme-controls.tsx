"use client";

import { CheckIcon, MoonIcon, PaletteIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PALETTES, usePalette, useThemeMode } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeControls({ className }: { className?: string }) {
  const { palette, setPalette } = usePalette();
  const { toggle } = useThemeMode();

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggle}
        // Static: resolvedTheme is undefined during SSR, so a label derived
        // from it hydrates mismatched. The icon already conveys the state.
        aria-label="Toggle light and dark mode"
      >
        {/* Both icons render; only one is visible, so there is no hydration
            flicker while next-themes resolves the stored mode. */}
        <SunIcon className="hidden dark:block" />
        <MoonIcon className="block dark:hidden" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Change colour theme">
            <PaletteIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Colour theme</DropdownMenuLabel>
          {PALETTES.map((option) => (
            <DropdownMenuItem
              key={option.id}
              onSelect={() => setPalette(option.id)}
              className="gap-2"
            >
              <span
                aria-hidden
                className="size-3.5 shrink-0 rounded-full ring-1 ring-foreground/15"
                style={{ background: option.swatch }}
              />
              <span className="flex-1">{option.label}</span>
              {palette === option.id && (
                <CheckIcon className="size-3.5 text-muted-foreground" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
