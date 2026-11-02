import type { Lang } from "@/lib/engine";

const CJK = /[㐀-鿿豈-﫿]/;
const VIET = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

/** Guess the language of one recognized text line: Chinese chars win, then Vietnamese diacritics, else English. */
export function detectLineLang(line: string): Lang {
  if (CJK.test(line)) return "zh";
  if (VIET.test(line)) return "vi";
  return "en";
}

/**
 * Split raw OCR text into trimmed, non-empty lines.
 * OCR engines insert spaces between CJK characters; remove them so the
 * line can match dictionary entries and saved translations.
 */
export function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) =>
      l
        .replace(/([㐀-鿿豈-﫿])\s+(?=[㐀-鿿豈-﫿])/g, "$1")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((l) => l.length >= 2);
}
