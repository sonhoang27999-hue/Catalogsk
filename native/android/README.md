# Android offline microphone

The custom Capacitor 6 plugin is named `OfflineSpeech`. It uses only Android's
`createOnDeviceSpeechRecognizer` (Android 12/API 31+), never the potentially remote
`createSpeechRecognizer`. Installed recognition services and offline language
models determine which of vi-VN, zh-CN and en-US actually work. Unsupported devices
or missing models get an error, never silent online audio processing.
10: `speech-bridge.js` exposes the Web Speech interface used by `src/lib/speech.ts`.
The Android activity injects it into the page the WebView actually loads: the app's
own bundled files in a self-contained build, or the configured `server.url` site.
This keeps browser/iPhone recognition unchanged. The activity must register the
plugin before creating the Capacitor bridge.

## Packaging

`.github/workflows/android-apk.yml` builds everything on GitHub:

20: 1. `bun install --frozen-lockfile && bun run build` produces the web app in `dist/client`.
2. A throwaway Capacitor 6 wrapper copies that output into its own `www/` folder, so the
   APK carries the app itself — no `server.url`, no hosting, no GitHub Pages required.
3. The two Java files go to `android/app/src/main/java/app/sktranslate/mobile/`,
   `speech-bridge.js` to `android/app/src/main/assets/`, and the manifest gets
   `RECORD_AUDIO`, `CAMERA` and a `<queries>` intent for `android.speech.RecognitionService`.
4. Gradle assembles the release build; the APK is zipaligned and signed with the
   keystore secrets, then uploaded as the run's artifact.

Required repository secrets: `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASS`,
30: `ANDROID_KEY_ALIAS`. Increase `versionCode` on every release. Keep the same signing
key so later APKs install over the old one without losing saved data.

Because the app ships inside the APK, a new release means installing a new APK —
there is no over-the-air update of the interface. The built-in server AI is not
reachable from a packaged build, so each phone must save its own OpenAI key in
Cài đặt; the app says so inline instead of calling a server that is not there.
**Open with internet first, then turn off the network to use native recognition.**
Translation without internet still uses the saved translations, phrase library and
dictionary fallback.

## Physical-device acceptance checks (not available in this sandbox)
40: 
- Install as an update without clearing existing app data; check saved terms/key.
- Allow microphone permission on first hold. Release during the permission dialog:
  no recording should begin after permission is granted; hold again to speak.
- Open online, enable airplane mode, hold each VI/中/EN mic, speak, release, and
  verify recognized text and one automatic translation attempt.
- Verify missing language models show an error and older Android versions do not
  fall back to remote recognition.
- Test long speech, pauses, rapid repeated holds, both conversation mics, and
  leaving the app while recording. Microphone must stop on release/backgrounding.
