import { useSyncExternalStore } from "react";

export type DealerVatMode = "excl" | "incl";
const KEY = "dealer-vat-mode";
const listeners = new Set<() => void>();

const read = (): DealerVatMode => {
  try {
    return localStorage.getItem(KEY) === "incl" ? "incl" : "excl";
  } catch {
    return "excl";
  }
};

export function setDealerVatMode(mode: DealerVatMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useDealerVatMode(): DealerVatMode {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "excl",
  );
}
