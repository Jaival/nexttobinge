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
  }
}`;

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

export async function searchAnime(search: string, page = 1, perPage = 20) {
  const data = await anilistFetch<{ Page: PageResult }>(SEARCH_QUERY, { search, page, perPage });
  return data.Page;
}

export async function getAnimeDetails(id: number) {
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
    };
  }>(DETAIL_QUERY, { id });
  return data.Media;
}

export function getAnimeTitle(anime: AniListMedia): string {
  return anime.title.english ?? anime.title.romaji;
}
