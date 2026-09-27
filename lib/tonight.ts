import { discoverMovies, discoverTV } from "@/lib/tmdb";
import { discoverAnime, type AnimeDiscoverOptions } from "@/lib/anilist";
import { animeToCard, movieToCard, tvToCard } from "@/lib/media-cards";
import type { MediaCardItem, MediaType } from "@/components/media-card";

// "What should I watch tonight?": moods mapped onto each source's filters.
// TMDB genre ids differ between movies and TV, and TV has no Horror genre at
// all, so each mood spells out all three. In with_genres "|" means OR and ","
// means AND.

export const MOODS = [
  {
    id: "funny",
    label: "Make me laugh",
    movie: { with_genres: "35" },
    tv: { with_genres: "35" },
    anime: { genres: ["Comedy"] },
  },
  {
    id: "tense",
    label: "Edge of my seat",
    movie: { with_genres: "53|80" },
    tv: { with_genres: "80|9648" },
    anime: { genres: ["Thriller", "Mystery"] },
  },
  {
    id: "scary",
    label: "Scare me",
    movie: { with_genres: "27" },
    tv: { with_keywords: "315058" }, // TMDB keyword "horror"
    anime: { genres: ["Horror"] },
  },
  {
    id: "mind",
    label: "Blow my mind",
    movie: { with_genres: "878|9648" },
    tv: { with_genres: "10765|9648" },
    anime: { genres: ["Psychological", "Sci-Fi"] },
  },
  {
    id: "epic",
    label: "Take me somewhere epic",
    movie: { with_genres: "12|14" },
    tv: { with_genres: "10759|10765" },
    anime: { genres: ["Adventure", "Fantasy"] },
  },
  {
    id: "heartfelt",
    label: "Something heartfelt",
    movie: { with_genres: "18,10749" },
    tv: { with_genres: "18" },
    anime: { genres: ["Drama", "Romance"] },
  },
  {
    id: "light",
    label: "Keep it light",
    movie: { with_genres: "10751|16" },
    tv: { with_genres: "10751" },
    anime: { genres: ["Slice of Life"] },
  },
] as const satisfies readonly {
  id: string;
  label: string;
  movie: Record<string, string>;
  tv: Record<string, string>;
  anime: AnimeDiscoverOptions;
}[];

export type MoodId = (typeof MOODS)[number]["id"];

export const TYPES: { id: MediaType; label: string; shortLabel: string }[] = [
  { id: "movie", label: "Movie", shortLabel: "Under 100 minutes" },
  { id: "tv", label: "Series", shortLabel: "Short episodes" },
  { id: "anime", label: "Anime", shortLabel: "13 episodes or fewer" },
];

export interface TonightOptions {
  mood: MoodId;
  type: MediaType;
  short: boolean;
  seed: number;
}

// Quality floors: the point is three good picks, not three obscure ones.
// Animation is excluded from movie and series results unless the mood asks
// for it, so anime doesn't crowd out the "Series" answer.
const MOVIE_FLOOR = { "vote_count.gte": "300", "vote_average.gte": "6.5" };
const TV_FLOOR = {
  "vote_count.gte": "150",
  "vote_average.gte": "7",
  without_genres: "16|10763|10764|10767", // animation, news, reality, talk
};
const ANIME_FLOOR = { minScore: 70, minPopularity: 20000 };

async function fetchPool({ mood, type, short }: TonightOptions, page: number) {
  const m = MOODS.find((x) => x.id === mood)!;
  if (type === "movie") {
    const data = await discoverMovies({
      ...MOVIE_FLOOR,
      ...(m.id === "light" ? {} : { without_genres: "16" }),
      ...m.movie,
      ...(short ? { "with_runtime.gte": "60", "with_runtime.lte": "100" } : {}),
      page: String(page),
    });
    return { items: data.results.map(movieToCard), pages: data.total_pages };
  }
  if (type === "tv") {
    const data = await discoverTV({
      ...TV_FLOOR,
      ...m.tv,
      // For series, TMDB's runtime filter applies to episode length.
      ...(short ? { "with_runtime.lte": "30" } : {}),
      page: String(page),
    });
    return { items: data.results.map(tvToCard), pages: data.total_pages };
  }
  const data = await discoverAnime({
    ...ANIME_FLOOR,
    ...m.anime,
    ...(short ? { maxEpisodes: 14 } : {}),
    page,
  });
  return { items: data.media.map(animeToCard), pages: data.pageInfo.lastPage };
}

/** Deterministic pseudo-random numbers from a seed (mulberry32). */
function seededRandom(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Only the most popular few pages: past that, picks get obscure. */
const POOL_PAGES = 5;
export const PICKS = 3;

/**
 * Three picks for a mood. The seed is in the URL, so the same link always
 * shows the same three titles (shareable), and "Shuffle" is just seed + 1.
 * Being deterministic also means the upstream responses stay cacheable:
 * every visitor on seed 4 asks TMDB for the same page.
 */
export async function getTonightPicks(options: TonightOptions): Promise<MediaCardItem[]> {
  const first = await fetchPool(options, 1);
  const page = (options.seed % Math.max(1, Math.min(POOL_PAGES, first.pages))) + 1;
  const { items } = page === 1 ? first : await fetchPool(options, page);

  // Fisher-Yates shuffle driven by the seed.
  const random = seededRandom(options.seed);
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, PICKS);
}
