# SK Translate — Architecture

Local-first Vietnamese ↔ Simplified Chinese translator prototype. No accounts, no cloud, no server persistence.

## Layers

| Layer | Path | Native iOS replacement |
| --- | --- | --- |
| Translation engine contract | `src/lib/engine/types.ts` | Swift protocol `TranslationEngine` |
| Demo engine (deterministic lookup) | `src/lib/engine/demoEngine.ts` | On-device model (Core ML / MLX / Apple Translation framework) |
| Engine registry | `src/lib/engine/index.ts` (`setEngine`) | Dependency injection |
| Local KV storage | `src/lib/storage.ts` (`KVStore`) | SQLite / SwiftData / Core Data |
| App state | `src/lib/store.ts` | ObservableObject view models |
| Speech (TTS / ASR) | `src/lib/speech.ts` | `AVSpeechSynthesizer`, `SFSpeechRecognizer` with `requiresOnDeviceRecognition = true` |
| Seed data | `src/data/*` | Bundled JSON |
| UI | `src/routes/*`, `src/components/sk/*` | SwiftUI views |

## Demo engine behaviour
1. Exact match (punctuation/case-insensitive) against the user's SK Dictionary, then the bundled phrase library → `status: "ok"`.
2. Otherwise, glossary term spotting → `status: "partial"` (UI shows "Chưa có bản dịch offline cho câu này" plus terms found).
3. Otherwise `status: "none"`. It never fabricates a translation.

## Plugging in a real engine
Implement `TranslationEngine` (`translate({ text, from, to, glossary })` → `TranslationResult`), honour `glossary` for SK terminology, return `pinyin` when `to === "zh"`, then call `setEngine(myEngine)` at startup. The UI needs no changes.

## Storage
All data is JSON under `localStorage` keys prefixed `sk-translate:` (`history`, `dictionary`, `chat`, `settings`). Replace `LocalStorageDriver` with an IndexedDB or native driver implementing `KVStore`.

## Speech privacy
Speech playback uses device voices or cached OpenAI audio. Browser speech recognition can process audio remotely. The Android APK injects `native/android/speech-bridge.js`, which routes the existing Web Speech contract to a custom Capacitor `OfflineSpeech` plugin. It strictly uses Android 12+ on-device recognition and reports missing services/language models; it never falls back to a recognizer that can upload audio. The existing remote-URL wrapper still needs internet to open initially; native speech can then run with the network off, while translation uses its existing offline fallback.

## Online + offline (hybrid)
Languages: Vietnamese, Simplified Chinese (with Pinyin), English. `translate(text, from, to, glossary, mode)` in `src/lib/engine/index.ts`:
1. Offline engine exact match (SK Dictionary / phrase library) wins.
2. Otherwise, if online translation is enabled and the device is online, `onlineEngine` calls the server function `translateOnline` (`src/lib/translate.functions.ts`), which uses the Lovable AI Gateway. Only the text and the relevant glossary terms are sent; nothing is stored server-side.
3. On failure or no network, the offline result (partial/none) is returned with a `notice`.
