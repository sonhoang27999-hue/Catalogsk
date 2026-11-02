/**
 * Where the app is actually running. The packaged Android app carries its own copy
 * of the web build, so there is no app server behind it: only the user's own OpenAI
 * key can reach an AI, and the service worker must stay out of the way.
 */
type CapacitorLike = { isNativePlatform?: () => boolean; isNative?: boolean };

export const isBundledApp = (): boolean => {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: CapacitorLike }).Capacitor;
  return cap?.isNativePlatform?.() === true || cap?.isNative === true;
};

/** Shown when a translation needs online AI but this build has no server AI and no user key. */
export const NEEDS_OPENAI_KEY = "Bản cài này không có AI sẵn trên máy chủ — hãy nhập API key OpenAI trong Cài đặt.";
