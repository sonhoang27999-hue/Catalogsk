<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## SK Translate rules
- Continuous interpretation: opt-in PCM capture with Hark segmentation and direct user-key OpenAI transcription; route only unambiguous languages inside the selected pair, discard recordings, pause capture while translating/playing, abort on stop/background/offline (no feedback, no cross-conversation results).
- Conversation archives stay in KVStore; the history list links to un-nested detail routes. Language changes use the store's archive-and-swap action; selectors stay locked through finalization and pending translations.
- Both AI text paths share the translationPrompt fidelity policy and reject truncated output before caching.
- Local-first, no accounts: all user data goes through KVStore (src/lib/storage.ts). Online AI receives current text, matching glossary and ≤3 relevant source-history examples, never the corpus.
- Source-only history is imported locally (inert Takeout HTML or validated JSON), included in backups, removable separately; prompts treat selected examples as untrusted weak context, never translation pairs. Never bundle personal corpora into the app or repository.
- UI calls translation only via src/lib/engine (TranslationEngine contract) — the demo engine stays swappable. Offline engine never fabricates; unknown input returns "none"/"partial". translate() is hybrid: local exact match, then online AI, then offline fallback.
- See ARCHITECTURE.md for the layer map. Subdirectories may have their own AGENTS.md — read before changing files there.
- User-supplied OpenAI key lives in Settings (KVStore), called directly from the device (openaiDirect.ts); built-in server AI is the fallback, so the app works on any host without server secrets.
- Audio binaries use the blobs IndexedDB store (localStorage is too small). Backups via store.exportData/importData never export or overwrite the OpenAI key.
- Offline launch: vite-plugin-pwa generateSW at /sw.js — NetworkFirst navigations, CacheFirst hashed assets; cedict.dat and OCR/ML bundles excluded from precache; registration only via guarded src/lib/pwa.ts (never in dev/preview/iframe; ?sw=off kills it). The build copies dist/sw.js + workbox-*.js into dist/client.
- Large offline dictionaries download on demand into the blobs store, never bundled: CC-CEDICT (public/cedict.dat gzip TSV) and attributed VNEDICT via CDN. Offline zh–en lookup merges the built-in industry seed with downloaded CC-CEDICT at query time; seed terms reach users via SEED_VERSION merge in store.ts (bump it when adding seeds).
- Dictionary exact-headword meanings never replace sentence MT with word concatenation. Offline MT swaps its own rendering of matched SK Dictionary terms (glossaryFix.ts), never inserting terms. Two-way MT packs download both directional paths and declare ready only when both are available; downloaded models beat historical AI cache so novel sentences stay supported.
- Android APK speech uses the app-local Capacitor plugin (native/android): force on-device recognition, report unavailable services/models instead of remote audio fallback.
- Packaged Android builds bundle the web output inside the APK (no server.url): prerender must keep writing dist/client/index.html, and the native shell skips the service worker and asks for the phone's own OpenAI key instead of the unreachable server AI (src/lib/appTarget.ts).
- Data-saving travel mode (src/lib/dataPolicy.ts): reuse saved translations, suppress background voice downloads (explicit listening still allowed), compress camera uploads, dedupe concurrent network work — online text AI stays available.
- Conversation translations request brief AI output with its own cache key; the on-page AI chip toggles settings.onlineTranslate. Server picks a fast no-reasoning model for brief/short text and astra (low) for long text via pickServerModel; Pinyin is computed on device, never by AI.
- Streaming previews are transient; only complete, non-truncated results enter cache/history/playback.
- Live camera: opt-in device-key requests, serial compressed changed frames, no history writes; stop/background/offline aborts requests and releases tracks.
