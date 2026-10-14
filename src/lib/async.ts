export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function friendlyError(e: unknown): string {
  const code = (e as { code?: string })?.code;
  const msg = e instanceof Error ? e.message : '';
  if (code === 'permission-denied') return 'Permission denied. Check your Firestore rules.';
  if (/timed out|abort/i.test(msg)) return 'The network is slow or blocked. Check your connection and try again.';
  if (/token missing/i.test(msg)) return 'Movie service is not configured (missing TMDB key).';
  if (/TMDB \d+/.test(msg)) return `Movie service error (${msg}). Try again.`;
  return msg || 'Something went wrong. Try again.';
}