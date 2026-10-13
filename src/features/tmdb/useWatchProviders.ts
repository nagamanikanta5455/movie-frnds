import { useEffect, useState } from 'react';
import { getProviders } from './tmdb.client';

export interface Provider { provider_id: number; provider_name: string; logo_path: string }
export interface ProvidersResult { link?: string; stream: Provider[]; rent: Provider[]; buy: Provider[] }

const cache = new Map<string, ProvidersResult>();

export function useWatchProviders(movieId: number | null, region: string) {
  const key = `${movieId}:${region}`;
  const [data, setData] = useState<ProvidersResult | null>(cache.get(key) ?? null);
  const [loading, setLoading] = useState(!!movieId && !cache.has(key));

  useEffect(() => {
    if (!movieId || cache.has(key)) return;
    let cancelled = false;
    setLoading(true);
    getProviders(movieId, region)
      .then((r) => { cache.set(key, r); if (!cancelled) setData(r); })
      .catch(() => { if (!cancelled) setData({ stream: [], rent: [], buy: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key, movieId, region]);

  return { data, loading };
}