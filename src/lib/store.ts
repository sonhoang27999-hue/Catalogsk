import { useSyncExternalStore } from "react";
import { blobs, kv } from "./storage";
import { DICT_SEED, type DictEntry } from "@/data/dictionarySeed";
import type { Lang } from "./engine";
import { normalizeSourceHistory, type SourceExample } from "./engine/sourceHistory";


export interface HistoryItem {
  id: string;
  from: Lang;
  to?: Lang | undefined;
  source: string;
  target: string;
  pinyin?: string | undefined;
  at: number;
}
export interface ChatMessage {
  id: string;
  from: Lang;
  to?: Lang | undefined;
  source: string;
  target: string;
  pinyin?: string | undefined;
  ok: boolean;
  engine?: string | undefined;
  missingTerms?: { src: string; dst: string }[] | undefined;
  at: number;
}
export interface ConversationLog {
  id: string;
  at: number;
  messages: ChatMessage[];
}
export interface QuickPhrase {
  id: string;
  vi: string;
  zh: string;
  en?: string | undefined;
}
export interface Settings {
  /** 1–10 (legacy "sm"/"md"/"lg" accepted). */
  textSize: number | "sm" | "md" | "lg";
  speechRate: number;
  autoSpeak: boolean;
  allowRecognition: boolean;
  /** Use online AI for sentences not in the local dictionary/phrases. */
  onlineTranslate: boolean;
  /** Avoid background audio downloads and reuse saved AI translations. */
  dataSaver: boolean;
  /** User's own OpenAI API key (stored only on this device). Empty = built-in AI. */
  openaiKey: string;
  openaiModel: string;
  voiceEngine: "device" | "openai";
  openaiVoice: string;
  /** Device TTS voice name per language (empty = automatic pick). */
  deviceVoices: { zh?: string; vi?: string; en?: string };
  /** Foreign language the reference pages (Từ điển, Công tác, Khẩn cấp) show; follows the Dịch screen. */
  workLang: "zh" | "en";
  profile: Profile;
}
export interface Profile {
  name: string;
  hotelName: string;
  hotelAddress: string;
  phone: string;
  allergy: string;
  blood: string;
}

interface State {
  ready: boolean;
  history: HistoryItem[];
  dictionary: DictEntry[];
  chat: ChatMessage[];
  conversations: ConversationLog[];
  quickPhrases: QuickPhrase[];
  settings: Settings;
  sourceHistory: SourceExample[];
  draft: { text: string; from: Lang; to?: Lang } | null;
}

const DEFAULT_SETTINGS: Settings = { textSize: 4, speechRate: 0.9, autoSpeak: false, allowRecognition: true, onlineTranslate: true, dataSaver: true, openaiKey: "", openaiModel: "gpt-4o-mini", voiceEngine: "device", openaiVoice: "alloy", deviceVoices: {}, workLang: "zh", profile: { name: "", hotelName: "", hotelAddress: "", phone: "", allergy: "", blood: "" } };

const initial: State = {
  ready: false,
  history: [],
  dictionary: DICT_SEED,
  chat: [],
  conversations: [],
  quickPhrases: [],
  settings: DEFAULT_SETTINGS,
  sourceHistory: [],
  draft: null,
};

let state = initial;
const listeners = new Set<() => void>();
const PERSISTED = ["history", "dictionary", "chat", "conversations", "quickPhrases", "settings", "sourceHistory"] as const;

function set(patch: Partial<State>) {
  state = { ...state, ...patch };
  for (const k of PERSISTED) if (k in patch) kv.set(k, state[k]);
  listeners.forEach((l) => l());
}

export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export const favKey = (from: Lang, source: string) => `${from}|${source.trim().toLowerCase()}`;

/** Seed terms added in later versions reach existing users once; terms the user deleted after that stay deleted. */
const SEED_VERSION = 2;
function mergeSeed(saved: DictEntry[] | undefined): DictEntry[] {
  if (!saved) { kv.set("seedVersion", SEED_VERSION); return DICT_SEED; }
  if ((kv.get<number>("seedVersion") ?? 1) >= SEED_VERSION) return saved;
  const have = new Set(saved.map((d) => d.zh));
  const merged = [...saved, ...DICT_SEED.filter((d) => !have.has(d.zh))];
  kv.set("seedVersion", SEED_VERSION);
  kv.set("dictionary", merged);
  return merged;
}

export const store = {
  get: () => state,
  hydrate() {
    if (state.ready) return;
    state = {
      ...state,
      ready: true,
      history: kv.get("history") ?? [],
      dictionary: mergeSeed(kv.get<DictEntry[]>("dictionary")),
      chat: kv.get("chat") ?? [],
      conversations: kv.get("conversations") ?? [],
      quickPhrases: kv.get("quickPhrases") ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(kv.get<Settings>("settings") ?? {}) },
      sourceHistory: normalizeSourceHistory(kv.get("sourceHistory") ?? []),
    };
    listeners.forEach((l) => l());
  },
  setDraft: (draft: State["draft"]) => set({ draft }),
  importSourceHistory(entries: SourceExample[]) {
    const merged = normalizeSourceHistory([...state.sourceHistory, ...entries]);
    set({ sourceHistory: merged });
    return merged.length;
  },
  clearSourceHistory: () => set({ sourceHistory: [] }),
  addHistory(item: Omit<HistoryItem, "id" | "at">) {
    const rest = state.history.filter((h) => favKey(h.from, h.source) !== favKey(item.from, item.source));
    set({ history: [{ ...item, id: uid(), at: Date.now() }, ...rest].slice(0, 500) });
  },
  deleteHistory: (id: string) => set({ history: state.history.filter((h) => h.id !== id) }),
  addQuickPhrase(p: { vi: string; zh: string; en?: string | undefined }) {
    const norm = { vi: p.vi.trim(), zh: p.zh.trim(), en: p.en?.trim() || undefined };
    if (!norm.vi && !norm.zh && !norm.en) return;
    const dup = state.quickPhrases.some((q) => q.vi === norm.vi && q.zh === norm.zh && (q.en ?? "") === (norm.en ?? ""));
    if (dup) return;
    set({ quickPhrases: [{ ...norm, id: uid() }, ...state.quickPhrases].slice(0, 50) });
  },
  deleteQuickPhrase: (id: string) => set({ quickPhrases: state.quickPhrases.filter((q) => q.id !== id) }),
  clearHistory: () => set({ history: [] }),
  upsertTerm(entry: Omit<DictEntry, "id" | "updatedAt"> & { id?: string }) {
    const e = { ...entry, id: entry.id ?? uid(), updatedAt: Date.now() } as DictEntry;
    const exists = state.dictionary.some((d) => d.id === e.id);
    set({ dictionary: exists ? state.dictionary.map((d) => (d.id === e.id ? e : d)) : [e, ...state.dictionary] });
  },
  /** Bulk import (CSV/Excel). Updates terms with the same Chinese, adds the rest. Returns [added, updated]. */
  importTerms(rows: Omit<DictEntry, "id" | "updatedAt">[]): [number, number] {
    const byZh = new Map(state.dictionary.map((d) => [d.zh, d]));
    let added = 0, updated = 0;
    for (const r of rows) {
      const old = byZh.get(r.zh);
      if (old) { byZh.set(r.zh, { ...old, ...r, id: old.id, updatedAt: Date.now() }); updated++; }
      else { byZh.set(r.zh, { ...r, id: uid(), updatedAt: Date.now() }); added++; }
    }
    set({ dictionary: [...byZh.values()] });
    return [added, updated];
  },
  deleteTerm: (id: string) => set({ dictionary: state.dictionary.filter((d) => d.id !== id) }),
  addChat: (m: Omit<ChatMessage, "id" | "at">) => set({ chat: [...state.chat, { ...m, id: uid(), at: Date.now() }] }),
  /** Archive the current conversation into history and start a fresh one. */
  clearChat() {
    const first = state.chat[0];
    if (!first) return;
    set({
      chat: [],
      conversations: [{ id: uid(), at: first.at, messages: [...state.chat] }, ...state.conversations].slice(0, 100),
    });
  },
  deleteConversation: (id: string) => set({ conversations: state.conversations.filter((c) => c.id !== id) }),
  changeConversationLanguage(pair: { me: Lang; them: Lang }, side: "me" | "them", language: Lang) {
    if (pair[side] === language) return pair;
    store.clearChat();
    return side === "me"
      ? { me: language, them: language === pair.them ? pair.me : pair.them }
      : { me: language === pair.me ? pair.them : pair.me, them: language };
  },
  discardCurrentChat: () => set({ chat: [] }),
  clearAllHistory: () => set({ history: [], chat: [], conversations: [] }),
  updateSettings: (p: Partial<Settings>) => set({ settings: { ...state.settings, ...p } }),
  /** Backup: everything the user created, as a plain object (API key excluded). */
  exportData() {
    const { history, dictionary, conversations, chat, quickPhrases, settings } = state;
    return { app: "sk-translate", version: 1, exportedAt: Date.now(), history, dictionary, conversations, chat, quickPhrases, sourceHistory: state.sourceHistory, settings: { ...settings, openaiKey: "" } };
  },
  importData(d: Record<string, unknown>) {
    if (d?.["app"] !== "sk-translate") throw new Error("File không phải bản sao lưu SK Translate");
    const arr = <T,>(k: string, cur: T[]) => (Array.isArray(d[k]) ? (d[k] as T[]) : cur);
    const inSettings = (d["settings"] ?? {}) as Partial<Settings>;
    set({
      history: arr("history", state.history),
      dictionary: arr("dictionary", state.dictionary),
      conversations: arr("conversations", state.conversations),
      chat: arr("chat", state.chat),
      quickPhrases: arr("quickPhrases", state.quickPhrases),
      sourceHistory: d["sourceHistory"] === undefined ? state.sourceHistory : normalizeSourceHistory(d["sourceHistory"]),
      settings: { ...state.settings, ...inSettings, openaiKey: state.settings.openaiKey, profile: { ...state.settings.profile, ...(inSettings.profile ?? {}) } },
    });
  },
  clearAll() {
    kv.clear();
    void blobs.clear();
    set({ ...initial, ready: true });
  },
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
    () => selector(initial),
  );
}

/** Normalise text size to level 1–10. */
export function textLevel(v: Settings["textSize"]): number {
  if (v === "sm") return 2;
  if (v === "md") return 4;
  if (v === "lg") return 7;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(10, Math.max(1, n)) : 4;
}
/** Level 1–10 → 12.5px … 17px: smaller floor and half the growth per level of the old 14–23px scale. */
export const textSizePx = (v: Settings["textSize"]) => `${12 + textLevel(v) * 0.5}px`;
