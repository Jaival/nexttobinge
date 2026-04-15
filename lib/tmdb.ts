import { env } from "@/env";

const BASE_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

function tmdbUrl(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", env.TMDB_API_KEY);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const res = await fetch(tmdbUrl(path, params), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
  tagline?: string;
  status?: string;
}

export interface TMDBTVShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  genres?: { id: number; name: string }[];
  number_of_episodes?: number;
  number_of_seasons?: number;
  tagline?: string;
  status?: string;
}

export interface TMDBPageResult<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export function posterUrl(path: string | null, size: "w185" | "w342" | "w500" | "w780" | "original" = "w342") {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function backdropUrl(path: string | null, size: "w780" | "w1280" | "original" = "w1280") {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export async function getTrendingMovies(page = "1") {
  return tmdbFetch<TMDBPageResult<TMDBMovie>>("/trending/movie/week", { page });
}

export async function getTrendingTV(page = "1") {
  return tmdbFetch<TMDBPageResult<TMDBTVShow>>("/trending/tv/week", { page });
}

export async function discoverMovies(params: Record<string, string> = {}) {
  return tmdbFetch<TMDBPageResult<TMDBMovie>>("/discover/movie", {
    sort_by: "popularity.desc",
    ...params,
  });
}

export async function discoverTV(params: Record<string, string> = {}) {
  return tmdbFetch<TMDBPageResult<TMDBTVShow>>("/discover/tv", {
    sort_by: "popularity.desc",
    ...params,
  });
}

export async function searchMovies(query: string, page = "1") {
  return tmdbFetch<TMDBPageResult<TMDBMovie>>("/search/movie", { query, page });
}

export async function searchTV(query: string, page = "1") {
  return tmdbFetch<TMDBPageResult<TMDBTVShow>>("/search/tv", { query, page });
}

export async function getMovieDetails(id: number) {
  return tmdbFetch<TMDBMovie>(`/movie/${id}`);
}

export async function getTVDetails(id: number) {
  return tmdbFetch<TMDBTVShow>(`/tv/${id}`);
}

export async function getMovieGenres() {
  const data = await tmdbFetch<{ genres: TMDBGenre[] }>("/genre/movie/list");
  return data.genres;
}

export async function getTVGenres() {
  const data = await tmdbFetch<{ genres: TMDBGenre[] }>("/genre/tv/list");
  return data.genres;
}

export async function getMovieCredits(id: number) {
  return tmdbFetch<{
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
  }>(`/movie/${id}/credits`);
}

export async function getTVCredits(id: number) {
  return tmdbFetch<{
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
  }>(`/tv/${id}/credits`);
}

export async function getSimilarMovies(id: number) {
  return tmdbFetch<TMDBPageResult<TMDBMovie>>(`/movie/${id}/similar`);
}

export async function getSimilarTV(id: number) {
  return tmdbFetch<TMDBPageResult<TMDBTVShow>>(`/tv/${id}/similar`);
}
