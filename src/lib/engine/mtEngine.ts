import { demoEngine } from "./demoEngine";
import { isMtReady, translateMt } from "@/lib/mt/offlineMt";
import { exactVnedict } from "@/lib/dict/vnedict";
import { initCedict, lookupCedict } from "@/lib/dict/cedict";
import type { TranslationEngine } from "./types";
import { applyTermFixes, termsInSource } from "./glossaryFix";

/**
 * Offline engine: trusted local exact matches first (dictionary/phrases),
 * then the on-device MT model when its pack is downloaded, then the
 * deterministic demo engine's honest "none"/"partial" answer.
 */
export const mtEngine: TranslationEngine = {
  id: "on-device-mt",
  label: "On-device MT",
  onDevice: true,
  async translate(req) {
    const local = await demoEngine.translate(req);
    if (local.status === "ok") return local;
    if (req.to === "en") {
      const meaning = req.from === "vi" ? await exactVnedict(req.text) : req.from === "zh" ? await (async () => {
        await initCedict();
        return lookupCedict(req.text).find((hit) => hit.zh === req.text.trim())?.en ?? null;
      })() : null;
      if (meaning) return { status: "ok", text: meaning, matches: local.matches, engineId: "offline-dictionary", notice: "Nghĩa từ trong từ điển ngoại tuyến" };
    }
    if (req.from !== req.to && isMtReady(req.from, req.to)) {
      try {
        let text = await translateMt(req.text, req.from, req.to);
        if (text) {
          // Respect the user's SK Dictionary: swap the model's wording for the saved term.
          const terms = termsInSource(req.text, req.from, req.to, req.glossary ?? []);
          if (terms.length) {
            const fixes = [];
            for (const t of terms) {
              try { const mt = await translateMt(t.src, req.from, req.to); if (mt) fixes.push({ mt, dst: t.dst }); } catch { /* skip term */ }
            }
            text = applyTermFixes(text, fixes);
          }
          return { status: "ok", text, matches: local.matches, engineId: this.id, notice: "Dịch ngoại tuyến ngay trên máy" };
        }
      } catch {
        /* fall through to the honest local answer */
      }
    }
    return local;
  },
};
