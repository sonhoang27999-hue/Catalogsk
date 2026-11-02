# Self-contained Android APK (Nov 2026)
- [x] Bundle the built app inside the APK: the GitHub workflow builds the web app, then wraps dist/client in a Capacitor shell with no server.url, so no hosting is needed; the native shell skips the service worker and asks for the phone's own OpenAI key instead of the unreachable server AI.
- [x] Verify the packaged build boots from its own files: the static build served with no app server renders the Translate screen and opens Hội thoại with no console errors; 108 tests pass.
- [ ] Install the new APK on the user's phone — the first install needs the old app removed (different signing key); then check offline cold start and hold-to-talk.

# Live camera translation
- [x] Add opt-in live camera preview with translated overlays, serial compressed changed-frame updates, copyable results and cleanup on stop/background/offline.
- [x] 18 focused tests pass; browser fake-camera/simulated AI verifies translated overlay, copy controls, stop releasing tracks and no overflow at 350px or runtime errors. Build OK.
- [ ] Verify real camera → OpenAI recognition on Android/iPhone — blocked by no physical device or user OpenAI test key. Not published.

# Progressive AI translation
- [x] Show transient streaming translations in Translate and both conversation modes; save/read only completed sentences and retain offline fallback.
- [x] Test streaming, truncation and cancellation (82 tests pass); verify real new 50-word conversation sentence, 20 progressive updates, reload persistence and no runtime errors at 350px. First visible text 2.84s; full completion 4.96s. Two-second target not met; upstream latency remains outside UI control. Not published.

# Expanded offline resources
- [x] Add attributed VNEDICT (54,356 parsed entries, 0.8 MB compressed) for local lookup and exact Vietnamese headword meanings; downloaded into the blob store, never concatenated into fabricated sentences.
- [x] Correct two-way model downloads/readiness and verify a new sentence through the real downloaded English–Vietnamese model with network disabled and empty AI cache, then read the result back in the Translate UI. Model preserved 327/tomorrow morning but omitted “lamps”; do not claim faithful offline quality for technical sentences.
- [x] Verify real VNEDICT download, reload and offline contract/mold lookup at 351px without overflow or runtime errors; 71 tests pass, build OK. Not published.

# Personal source-history context
- [x] Add local import/removal and relevant source-only context for both online translation providers, with backup support; no personal corpus bundled or remote persistence.
- [x] Verify import, matching, privacy boundaries and device persistence; provide a private import file with 3,181 deduplicated explicitly directed entries from the Google export. Phone-sized import/reload/removal verified; 66 tests pass and build OK. Actual improvement in AI translation quality remains unmeasured; no claim of model training. Not published.

# Continuous conversation
- [x] Add opt-in online continuous recognition, two-language detection, translation and optional playback without microphone feedback.
- [x] Verify language routing, stop/cleanup, optional playback and phone-sized start/stop controls: 58 tests pass; browser fake-microphone check locks/unlocks selectors, sends no silent audio and has no runtime errors; build OK.
- [x] Put the continuous-translation button on the same row as the new-conversation action; verified side by side at 350px with no label clipping and the consent panel still opening.
- [ ] Verify real speech → OpenAI language detection → translation → playback on Android/iPhone — blocked by no user-account OpenAI test key and no physical devices; existing APK WebView microphone permission handling remains unverified. Not published or repackaged.

# Conversation language changes
- [x] Archive the current conversation when either language changes; both selectors and saved details verified at 350px, with 13 focused tests passing.

# Complete offline dictionary
- [x] Include all 151 built-in industry terms in Chinese–English offline lookup; 6 focused tests pass, and phone-sized browser checks verify industry searches without network plus downloaded general dictionary persistence and offline LED lookup.

# Android offline microphone
- [x] Make the new-conversation action visible, archive the old conversation, and open each history list item on its own detail page; verified two-sided input, archive, detail reload and return to list at 350px (8 focused tests pass).
- [x] Add Android on-device speech plugin and browser-compatible push-to-talk bridge.
- [x] Package and verify an updated installable APK (matching signing certificate; 18 tests pass; hold/release flow simulated offline).
- [x] Document device language-pack requirements and physical-device testing limits.
- [ ] Verify real offline speech on the user's Android phone — blocked by no physical device/microphone or installed language models in this sandbox.

# Faithful long-sentence translation
- [x] Strengthen both AI translation paths without extra automatic requests and reject truncated output.
- [x] Test full-input preservation and verify a real long-sentence translation (300 sets, 12 V, 25 October deadline, sample approval, no component substitution or partial delivery).

# Travel data saving
- [x] Add a saved data-saving setting, enabled by default, without disabling online text translation.
- [x] Reuse saved translations and deduplicate voice downloads; avoid background audio in data-saving mode.
- [x] Compress camera uploads and avoid repeat uploads when switching back to a previous result.
- [x] Test network request counts and settings on a phone-sized screen (cached translation: zero AI requests; actual carrier data usage not measured).
# On-device camera OCR
- [x] Add tesseract.js on-device OCR for Chinese/Vietnamese/English with one-time downloadable language pack (IndexedDB cache), offline camera mode translating via local dictionary and saved translations; verified end-to-end at 350px (downloaded pack, recognized a Chinese sign image, translated both lines offline; 41 tests pass).

# Offline launch + retranslate (Oct 2026)
- [x] Service worker (vite-plugin-pwa, guarded registration) so web/PWA and the URL-loading Android APK open offline after one online visit; build copies sw.js into dist/client; 59 tests pass, build OK, Dịch lại button verified at 350px.
- [x] "Dịch lại" button on the Translate result card re-asks the AI, bypassing and overwriting the saved translation (force option in translate()).
- [ ] No new APK built: native code unchanged and the APK loads the published site, so publishing updates it; the previous signing key is unavailable in this sandbox, so a rebuilt APK would require uninstalling (losing saved data).
- [ ] Verify offline cold launch on the published site and in the installed APK on the user's phone — requires a physical device.
- [x] Verify on-device MT end-to-end with real sentences: all four OPUS-MT models load and translate; zh→vi pivot keeps numbers/dates (300 sets, 25 Oct) but can drop a modifier (LED) — acceptable fallback quality, online AI remains the main path.
