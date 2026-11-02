/**
 * Service-worker registration wrapper — the only registrar in the app.
 * Never registers in dev, in iframes, or in Lovable preview/editor contexts;
 * in those contexts it unregisters any stale /sw.js registration instead.
 * Kill switch: add ?sw=off to the URL to unregister.
 */
import { isBundledApp } from "./appTarget";

const SW_URL = "/sw.js";

const isRefusedContext = (): boolean => {
  if (!import.meta.env.PROD) return true;
  // The packaged app already ships its own files; a cache in front of them only goes stale.
  if (isBundledApp()) return true;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return true;
  if (window.self !== window.top) return true;
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).get("sw") === "off") return true;
  return false;
};

const unregisterOurs = async () => {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => r.active?.scriptURL.endsWith(SW_URL) || r.waiting?.scriptURL.endsWith(SW_URL) || r.installing?.scriptURL.endsWith(SW_URL))
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
};

export const registerPwa = () => {
  if (isRefusedContext()) {
    void unregisterOurs();
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL).catch(() => {
      /* registration failure is non-fatal */
    });
  });
};
