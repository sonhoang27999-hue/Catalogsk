import type { Lang } from "./types";

export type ContextTurn = { from: Lang; text: string };

/** Last 4 conversation turns (oldest first) as untranslated context, each ≤ 500 chars. */
export function recentContext(chat: { from: Lang; source: string; at: number }[], max = 4): ContextTurn[] {
  return [...chat]
    .filter((m) => m.source?.trim())
    .sort((a, b) => a.at - b.at)
    .slice(-max)
    .map((m) => ({ from: m.from, text: m.source.trim().slice(0, 500) }));
}

/** User-key models: reasoning families reject temperature. */
export function supportsTemperature(model: string) {
  return !/^(o\d|gpt-5|gpt-6)/i.test(model.trim());
}
