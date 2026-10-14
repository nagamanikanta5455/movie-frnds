const NAME_KEY = 'mnm:name';

export function getSavedName(): string {
  try { return sessionStorage.getItem(NAME_KEY) ?? ''; } catch { return ''; }
}

export function saveName(name: string): void {
  try { sessionStorage.setItem(NAME_KEY, name); } catch { /* private mode */ }
}

// One-time cleanup of the old persistent value
try { localStorage.removeItem(NAME_KEY); } catch { /* ignore */ }