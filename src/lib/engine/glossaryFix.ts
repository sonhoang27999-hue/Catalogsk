import type { Lang } from "@/lib/engine/types";
import type { GlossaryEntry } from "./types";

const norm = (s: string) => s.normalize("NFC").toLowerCase();

/** User terms whose source wording appears in the text, longest first (most specific wins). */
export function termsInSource(text: string, from: Lang, to: Lang, glossary: GlossaryEntry[], max = 8): { src: string; dst: string }[] {
  const t = norm(text);
  const seen = new Set<string>();
  return glossary
    .map((g) => ({ src: (g[from] ?? "").trim(), dst: (g[to] ?? "").trim() }))
    .filter((p) => p.src.length > 1 && p.dst && t.includes(norm(p.src)))
    .sort((a, b) => b.src.length - a.src.length)
    .filter((p) => (seen.has(norm(p.src)) ? false : (seen.add(norm(p.src)), true)))
    .slice(0, max);
}

/**
 * Replace the machine rendering of each term with the user's preferred term.
 * Only replaces wording actually present in the output; never inserts terms.
 */
export function applyTermFixes(output: string, fixes: { mt: string; dst: string }[]): string {
  let out = output;
  for (const { mt, dst } of fixes) {
    const m = mt.trim().replace(/[.。!！?？]+$/, "");
    if (m.length < 2 || norm(out).includes(norm(dst))) continue;
    const i = norm(out).indexOf(norm(m));
    if (i >= 0) out = out.slice(0, i) + dst + out.slice(i + m.length);
  }
  return out;
}

/** Mandatory terms found in the source whose required wording is absent from the translation. Never edits the output. */
export function missingTerms(source: string, output: string, from: Lang, to: Lang, glossary: GlossaryEntry[]): { src: string; dst: string }[] {
  const out = norm(output);
  return termsInSource(source, from, to, glossary, 40).filter((t) => !out.includes(norm(t.dst)));
}
