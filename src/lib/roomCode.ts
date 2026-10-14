// Room IDs are URL-safe: letters, digits, "_" and "-".
const BARE_CODE = /^[A-Za-z0-9_-]{3,64}$/;
const FROM_LINK = /\/r\/([A-Za-z0-9_-]+)/;

/**
 * Accepts a bare code ("abc123xyz"), a full link ("https://site.app/r/abc123xyz?x=1"),
 * a link without protocol ("site.app/r/abc123xyz"), or a code with stray spaces.
 * Returns the room ID, or null if nothing usable is found.
 */
export function parseRoomCode(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  // Works on full URLs, protocol-less URLs, and even "join me: https://…/r/abc"
  const fromLink = input.match(FROM_LINK);
  if (fromLink) return fromLink[1];

  // Bare code: drop any whitespace ("abc 123" or a trailing newline from copy/paste)
  const compact = input.replace(/\s+/g, '');
  return BARE_CODE.test(compact) ? compact : null;
}