/** Split AI output: translation, then optional "PINYIN:" and "MEANING:" lines. */
export function parseAi(out: string): { text: string; pinyin: string; meaning: string } {
  const grab = (tag: string) => {
    const m = out.match(new RegExp(`^\\s*${tag}:\\s*(.*)$`, "im"));
    return m ? m[1]!.trim() : "";
  };
  const first = out.search(/^\s*(PINYIN|MEANING):/im);
  return { text: (first >= 0 ? out.slice(0, first) : out).trim(), pinyin: grab("PINYIN"), meaning: grab("MEANING") };
}
