/** Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #027 (MIT, © 2026 Seokwoooo) */
export const RECENT_SEARCH_KEY = "autodeco.search.recent";
export function recentSearches(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<string, string>();
  for (const entry of value) {
    if (typeof entry !== "string" || entry.trim().length < 2) continue;
    const term = entry.trim();
    if (!unique.has(term.toLocaleLowerCase("vi"))) unique.set(term.toLocaleLowerCase("vi"), term);
  }
  return [...unique.values()].slice(0, 5);
}
export function rememberSearch(current: string[], term: string) {
  if (term.trim().length < 2) return current;
  return recentSearches([term, ...current]);
}
const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLocaleLowerCase("vi");
export function searchTextParts(text: string, query: string): { text: string; match: boolean }[] {
  const needle = fold(query.trim());
  if (!needle) return [{ text, match: false }];
  let normalized = "";
  const offsets: number[] = [];
  let offset = 0;
  for (const char of text) {
    const part = fold(char);
    normalized += part;
    for (let i = 0; i < part.length; i++) offsets.push(offset);
    offset += char.length;
  }
  offsets.push(text.length);
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;
  let start = normalized.indexOf(needle);
  while (start >= 0) {
    const from = offsets[start] ?? 0;
    const to = offsets[start + needle.length] ?? text.length;
    if (from > cursor) parts.push({ text: text.slice(cursor, from), match: false });
    parts.push({ text: text.slice(from, to), match: true });
    cursor = to;
    start = normalized.indexOf(needle, start + needle.length);
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts.length ? parts : [{ text, match: false }];
}