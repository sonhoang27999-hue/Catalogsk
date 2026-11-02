import { pinyin } from "pinyin-pro";

/** On-device Hanyu Pinyin with tone marks; non-Han runs (digits, Latin, punctuation) are kept as-is. */
export function toPinyin(zh: string): string {
  if (!zh.trim()) return "";
  return pinyin(zh, { toneType: "symbol", type: "string", nonZh: "consecutive" }).replace(/\s+/g, " ").trim();
}
