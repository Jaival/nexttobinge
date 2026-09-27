import type { AnimeDiscoverOptions } from "@/lib/anilist";
import type { TMDBGenre } from "@/lib/tmdb";

// Filters for the browse grids. They live in the URL (?genre=35&year=2024),
// which makes a filtered grid shareable and bookmarkable, and lets the server
// render it. Every value is checked against a known list before it reaches an
// API: search params are user input.

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  name: string;
  label: string;
  options: FilterOption[];
}

type Params = Record<string, string | undefined>;

export function parsePage(value: string | undefined) {
  const page = Number(value);
  // TMDB refuses anything past page 500.
  return Number.isInteger(page) && page >= 1 ? Math.min(page, 500) : 1;
}

const FIRST_YEAR = 1950;
const YEAR_OPTIONS: FilterOption[] = Array.from(
  { length: new Date().getFullYear() - FIRST_YEAR + 1 },
  (_, i) => String(new Date().getFullYear() - i)
).map((y) => ({ value: y, label: y }));

const RATING_OPTIONS: FilterOption[] = ["8", "7", "6"].map((r) => ({ value: r, label: `${r}+` }));

/** Keeps a value only if it's one of the options. */
function pick(value: string | undefined, options: FilterOption[]) {
  return options.some((o) => o.value === value) ? value : undefined;
}

function isFiltered(values: Params) {
  return Object.values(values).some(Boolean);
}

const TMDB_SORTS: FilterOption[] = [
  { value: "popular", label: "Most popular" },
  { value: "top", label: "Top rated" },
  { value: "new", label: "Newest" },
];

export function tmdbFilters(kind: "movie" | "tv", genres: TMDBGenre[], params: Params) {
  const genreOptions = genres.map((g) => ({ value: String(g.id), label: g.name }));
  const defs: FilterDef[] = [
    { name: "sort", label: "Sort", options: TMDB_SORTS },
    { name: "genre", label: "Genre", options: genreOptions },
    { name: "year", label: "Year", options: YEAR_OPTIONS },
    { name: "rating", label: "Rating", options: RATING_OPTIONS },
  ];
  const values = {
    // "popular" is the default, so it's left out of the URL.
    sort: pick(params.sort, TMDB_SORTS.slice(1)),
    genre: pick(params.genre, genreOptions),
    year: pick(params.year, YEAR_OPTIONS),
    rating: pick(params.rating, RATING_OPTIONS),
  };

  const dateField = kind === "movie" ? "primary_release_date" : "first_air_date";
  const discover: Record<string, string> = {};
  if (values.sort === "top") {
    discover.sort_by = "vote_average.desc";
    // Otherwise a film with one 10/10 vote tops the list.
    discover["vote_count.gte"] = "300";
  } else if (values.sort === "new") {
    discover.sort_by = `${dateField}.desc`;
    // Released up to today: TMDB also lists announced titles years out.
    discover[`${dateField}.lte`] = new Date().toISOString().slice(0, 10);
    discover["vote_count.gte"] = "20";
  }
  if (values.genre) discover.with_genres = values.genre;
  if (values.year) discover[kind === "movie" ? "primary_release_year" : "first_air_date_year"] = values.year;
  if (values.rating) {
    discover["vote_average.gte"] = values.rating;
    discover["vote_count.gte"] ??= "100";
  }

  return { defs, values, discover, filtered: isFiltered(values) };
}

const ANIME_SORTS: FilterOption[] = [
  { value: "trending", label: "Trending now" },
  { value: "popular", label: "Most popular" },
  { value: "top", label: "Top rated" },
];

const ANIME_FORMATS: FilterOption[] = [
  { value: "TV", label: "TV series" },
  { value: "MOVIE", label: "Movie" },
  { value: "ONA", label: "Web series" },
  { value: "OVA", label: "OVA" },
];

const ANIME_SORT_KEYS = {
  trending: "TRENDING_DESC",
  popular: "POPULARITY_DESC",
  top: "SCORE_DESC",
} as const;

export function animeFilters(genres: string[], params: Params) {
  const genreOptions = genres.map((g) => ({ value: g, label: g }));
  const defs: FilterDef[] = [
    { name: "sort", label: "Sort", options: ANIME_SORTS },
    { name: "genre", label: "Genre", options: genreOptions },
    { name: "year", label: "Year", options: YEAR_OPTIONS },
    { name: "format", label: "Format", options: ANIME_FORMATS },
  ];
  const values = {
    sort: pick(params.sort, ANIME_SORTS.slice(1)) as "popular" | "top" | undefined,
    genre: pick(params.genre, genreOptions),
    year: pick(params.year, YEAR_OPTIONS),
    format: pick(params.format, ANIME_FORMATS) as "TV" | "MOVIE" | "ONA" | "OVA" | undefined,
  };

  const discover: AnimeDiscoverOptions = {
    sort: ANIME_SORT_KEYS[values.sort ?? "trending"],
    genres: values.genre ? [values.genre] : undefined,
    year: values.year ? Number(values.year) : undefined,
    formats: values.format ? [values.format] : undefined,
    // Same idea as vote_count.gte on TMDB: top rated means rated by many.
    minPopularity: values.sort === "top" ? 10000 : undefined,
  };

  return { defs, values, discover, filtered: isFiltered(values) };
}
