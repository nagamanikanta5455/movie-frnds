import type { MovieCard } from '@/types/room';

const BASE = 'https://api.themoviedb.org/3';
const TOKEN = import.meta.env.VITE_TMDB_TOKEN; 

async function tmdb<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${BASE}${path}?${qs}`, { 
    headers: { Authorization: `Bearer ${TOKEN}` } 
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

export async function buildDeck(opts: { genreIds: number[]; providerIds: number[]; region: string; round?: number }): Promise<MovieCard[]> {
  const round = opts.round || 1;
  const startPage = (round - 1) * 3 + 1; // Round 1: pages 1,2,3. Round 2: pages 4,5,6.

  const pages = await Promise.all([startPage, startPage + 1, startPage + 2].map((page) =>
    tmdb<{ results: any[] }>('/discover/movie', {
      page,
      sort_by: 'popularity.desc',
      'vote_count.gte': 300,
      watch_region: opts.region,
      ...(opts.genreIds.length && { with_genres: opts.genreIds.join('|') }),
      ...(opts.providerIds.length && { with_watch_providers: opts.providerIds.join('|') }),
    }),
  ));
  
  const seen = new Set<number>();
  return pages.flatMap((p) => p.results)
    .filter((m) => m.poster_path && !seen.has(m.id) && seen.add(m.id))
    .slice(0, 40)
    .map((m) => ({
      id: m.id, title: m.title, year: (m.release_date ?? '').slice(0, 4),
      overview: m.overview, posterPath: m.poster_path, backdropPath: m.backdrop_path,
      rating: m.vote_average, genreIds: m.genre_ids,
    }));
}
export async function getProviders(movieId: number, region: string) {
  const r = await tmdb<{ results: Record<string, any> }>(`/movie/${movieId}/watch/providers`);
  const x = r.results[region];
  return { link: x?.link as string | undefined, stream: x?.flatrate ?? [], rent: x?.rent ?? [], buy: x?.buy ?? [] };
}