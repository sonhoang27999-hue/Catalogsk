/* APK-only Web Speech adapter. Android audio never leaves the on-device recognizer. */
(() => {
  const cap = window.Capacitor;
  if (!cap || !cap.nativeCallback || window.SKAndroidSpeechInstalled) return;
  window.SKAndroidSpeechInstalled = true;
  let sequence = 0;
  class AndroidRecognition {
    constructor() {
      this.lang = 'vi-VN';
      this.interimResults = true;
      this.continuous = true;
      this.onresult = null;
      this.onerror = null;
      this.onend = null;
      this.active = false;
    }
    start() {
      if (this.active) throw new Error('Already listening');
      this.active = true;
      const sessionId = String(++sequence);
      this.sessionId = sessionId;
      cap.nativeCallback('OfflineSpeech', 'start', { language: this.lang, sessionId }, (event, error) => {
        if (!this.active || this.sessionId !== sessionId) return;
        if (error || event?.error) {
          this.active = false;
          this.onerror?.({ error: event?.error || error?.message || 'Không khởi động được micro Android' });
          return;
        }
        if (typeof event?.text === 'string') {
          const result = [{ transcript: event.text }];
          result.isFinal = Boolean(event.final);
          this.onresult?.({ results: [result], resultIndex: 0 });
        }
        if (event?.done) {
          this.active = false;
          this.onend?.();
        }
      });
    }
    stop() {
      if (this.active) cap.nativePromise('OfflineSpeech', 'stop', { sessionId: this.sessionId }).catch(() => {});
    }
    abort() {
      this.stop();
    }
  }
  window.SpeechRecognition = AndroidRecognition;
  window.webkitSpeechRecognition = AndroidRecognition;
})();