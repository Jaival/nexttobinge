import { cache } from "react";

const ANILIST_URL = "https://graphql.anilist.co";

async function anilistFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`AniList error: ${res.status}`);
  const json = (await res.json()) as { data: T };
  return json.data;
}

export interface AniListMedia {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string;
  };
  description: string | null;
  coverImage: {
    large: string;
    extraLarge: string;
    color: string | null;
  };
  bannerImage: string | null;
  averageScore: number | null;
  popularity: number;
  episodes: number | null;
  season: string | null;
  seasonYear: number | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  genres: string[];
  status: string;
  format: string;
  studios: { nodes: { id: number; name: string }[] };
}

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  description(asHtml: false)
  coverImage { large extraLarge color }
  bannerImage
  averageScore
  popularity
  episodes
  season
  seasonYear
  startDate { year month day }
  genres
  status
  format
  studios(isMain: true) { nodes { id name } }
`;

const TRENDING_QUERY = `
query TrendingAnime($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
      ${MEDIA_FIELDS}
    }
  }
}`;

const POPULAR_QUERY = `
query PopularAnime($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      ${MEDIA_FIELDS}
    }
  }
}`;

const SEARCH_QUERY = `
query SearchAnime($search: String, $page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(type: ANIME, search: $search, isAdult: false) {
      ${MEDIA_FIELDS}
    }
  }
}`;

const DETAIL_QUERY = `
query AnimeDetail($id: Int) {
  Media(id: $id, type: ANIME) {
    ${MEDIA_FIELDS}
    relations {
      edges {
        relationType
        node { id title { romaji english } coverImage { large } format }
      }
    }
    characters(sort: ROLE, perPage: 10) {
      nodes { id name { full } image { large } }
    }
    trailer { id site }
    externalLinks { id site url type language }
  }
}`;

// Every argument is optional: AniList ignores variables that are left out, so
// one query serves the browse filters, the mood picker and the collections.
const DISCOVER_QUERY = `
query DiscoverAnime(
  $page: Int, $perPage: Int, $sort: [MediaSort], $genres: [String], $year: Int,
  $formats: [MediaFormat], $maxEpisodes: Int, $minScore: Int, $minPopularity: Int
) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage }
    media(
      type: ANIME, isAdult: false, sort: $sort, genre_in: $genres, seasonYear: $year,
      format_in: $formats, episodes_lesser: $maxEpisodes,
      averageScore_greater: $minScore, popularity_greater: $minPopularity
    ) {
      ${MEDIA_FIELDS}
    }
  }
}`;

const RECOMMENDATIONS_QUERY = `
query AnimeRecommendations($id: Int) {
  Media(id: $id, type: ANIME) {
    recommendations(sort: RATING_DESC, perPage: 12) {
      nodes { mediaRecommendation { isAdult ${MEDIA_FIELDS} } }
    }
  }
}`;

const GENRES_QUERY = `query { GenreCollection }`;

export interface AniListExternalLink {
  id: number;
  site: string;
  url: string;
  /** STREAMING, INFO or SOCIAL */
  type: string;
  language: string | null;
}

interface PageInfo {
  total: number;
  currentPage: number;
  lastPage: number;
  hasNextPage: boolean;
}

interface PageResult {
  pageInfo: PageInfo;
  media: AniListMedia[];
}

export async function getTrendingAnime(page = 1, perPage = 20) {
  const data = await anilistFetch<{ Page: PageResult }>(TRENDING_QUERY, { page, perPage });
  return data.Page;
}

export async function getPopularAnime(page = 1, perPage = 20) {
  const data = await anilistFetch<{ Page: PageResult }>(POPULAR_QUERY, { page, perPage });
  return data.Page;
}

export interface AnimeDiscoverOptions {
  page?: number;
  perPage?: number;
  sort?: "TRENDING_DESC" | "POPULARITY_DESC" | "SCORE_DESC";
  genres?: readonly string[];
  year?: number;
  formats?: readonly ("TV" | "TV_SHORT" | "MOVIE" | "ONA" | "OVA" | "SPECIAL")[];
  /** Strictly fewer than this many episodes: 14 means "13 or fewer". */
  maxEpisodes?: number;
  /** 0-100 */
  minScore?: number;
  minPopularity?: number;
}

export async function discoverAnime({ sort = "POPULARITY_DESC", ...options }: AnimeDiscoverOptions = {}) {
  const data = await anilistFetch<{ Page: PageResult }>(DISCOVER_QUERY, {
    page: 1,
    perPage: 20,
    ...options,
    sort: [sort],
  });
  return data.Page;
}

// cache(): the browse page and its generateMetadata both need the list.
export const getAnimeGenres = cache(async function getAnimeGenres() {
  const data = await anilistFetch<{ GenreCollection: string[] }>(GENRES_QUERY);
  // Adult titles are filtered out of every query, so their genre would only
  // ever show an empty grid.
  return data.GenreCollection.filter((g) => g !== "Hentai");
});

export async function getAnimeRecommendations(id: number) {
  const data = await anilistFetch<{
    Media: {
      recommendations: {
        nodes: { mediaRecommendation: (AniListMedia & { isAdult: boolean }) | null }[];
      };
    };
  }>(RECOMMENDATIONS_QUERY, { id });
  // A recommendation's target can be deleted, which leaves it null.
  return data.Media.recommendations.nodes
    .map((n) => n.mediaRecommendation)
    .filter((m): m is AniListMedia & { isAdult: boolean } => m !== null && !m.isAdult);
}

export async function searchAnime(search: string, page = 1, perPage = 20) {
  const data = await anilistFetch<{ Page: PageResult }>(SEARCH_QUERY, { search, page, perPage });
  return data.Page;
}

// AniList is GraphQL, so every request is a POST, and Next.js only dedupes GET
// fetches. cache() gives the detail page and its generateMetadata one shared
// request per render instead of two.
export const getAnimeDetails = cache(async function getAnimeDetails(id: number) {
  const data = await anilistFetch<{
    Media: AniListMedia & {
      relations: {
        edges: {
          relationType: string;
          node: {
            id: number;
            title: { romaji: string; english: string | null };
            coverImage: { large: string };
            format: string;
          };
        }[];
      };
      characters: {
        nodes: { id: number; name: { full: string }; image: { large: string } }[];
      };
      trailer: { id: string; site: string } | null;
      externalLinks: AniListExternalLink[];
    };
  }>(DETAIL_QUERY, { id });
  return data.Media;
});

export function getAnimeTitle(anime: AniListMedia): string {
  return anime.title.english ?? anime.title.romaji;
}

/** AniList descriptions carry inline HTML. */
export function getAnimeDescription(anime: AniListMedia): string | null {
  return anime.description
    ? anime.description.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")
    : null;
}
