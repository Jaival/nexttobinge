"use client";

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export const PALETTES = [
  { id: "violet", label: "Cinema Violet", swatch: "oklch(0.7 0.16 292)" },
  { id: "coral", label: "Warm Coral", swatch: "oklch(0.755 0.145 34)" },
  { id: "mint", label: "Mint Ink", swatch: "oklch(0.79 0.135 172)" },
] as const;

export type Palette = (typeof PALETTES)[number]["id"];

export const PALETTE_STORAGE_KEY = "ntb-palette";
export const DEFAULT_PALETTE: Palette = "violet";

/**
 * Runs before first paint so the palette never flashes. next-themes ships its
 * own equivalent for the light/dark class. Keep in sync with DEFAULT_PALETTE.
 */
export const PALETTE_SCRIPT = `try{var p=localStorage.getItem("${PALETTE_STORAGE_KEY}");if(p&&p!=="${DEFAULT_PALETTE}"){document.documentElement.dataset.palette=p}}catch(e){}`;

/**
 * theme-color drives the mobile status bar. A single value gives light mode a
 * black bar. Hardcoded rather than read from computed styles because oklch()
 * is not reliably accepted in the meta tag. Matches --background per block.
 */
const THEME_COLOR: Record<Palette, { dark: string; light: string }> = {
  violet: { dark: "#111016", light: "#fdfdfe" },
  coral: { dark: "#141310", light: "#fefdfb" },
  mint: { dark: "#0e1113", light: "#fbfdfe" },
};

function isPalette(value: string | undefined): value is Palette {
  return !!value && PALETTES.some((p) => p.id === value);
}

/**
 * The <html> element is the source of truth — the blocking script writes it
 * before React exists. Reading it through an external store (rather than
 * copying it into state inside an effect) keeps hydration correct and avoids
 * a cascading render.
 */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot(): Palette {
  const applied = document.documentElement.dataset.palette;
  return isPalette(applied) ? applied : DEFAULT_PALETTE;
}

function getServerSnapshot(): Palette {
  return DEFAULT_PALETTE;
}

interface PaletteContextValue {
  palette: Palette;
  setPalette: (palette: Palette) => void;
}

const PaletteContext = createContext<PaletteContextValue>({
  palette: DEFAULT_PALETTE,
  setPalette: () => {},
});

export function usePalette() {
  return useContext(PaletteContext);
}

/** Time-boxed colour crossfade so switching never jumps brightness abruptly. */
function crossfade() {
  const root = document.documentElement;
  root.classList.add("theme-fade");
  window.setTimeout(() => root.classList.remove("theme-fade"), 240);
}

function PaletteProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const palette = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    const mode = resolvedTheme === "light" ? "light" : "dark";
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = THEME_COLOR[palette][mode];
  }, [palette, resolvedTheme]);

  const setPalette = useCallback((next: Palette) => {
    crossfade();
    const root = document.documentElement;
    if (next === DEFAULT_PALETTE) {
      delete root.dataset.palette;
    } else {
      root.dataset.palette = next;
    }
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, next);
    } catch {
      // Private mode or storage disabled — the palette just will not persist.
    }
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(() => ({ palette, setPalette }), [palette, setPalette]);

  return <PaletteContext.Provider value={value}>{children}</PaletteContext.Provider>;
}

/** Wraps the mode toggle so it gets the same crossfade as the palette picker. */
export function useThemeMode() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const toggle = useCallback(() => {
    crossfade();
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  return { isDark, toggle, setTheme };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    // No disableTransitionOnChange: it injects `transition: none !important`
    // across the document during the switch, which would defeat .theme-fade.
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <PaletteProvider>{children}</PaletteProvider>
    </NextThemesProvider>
  );
}
