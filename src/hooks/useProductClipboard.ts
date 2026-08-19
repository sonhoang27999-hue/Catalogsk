/**
 * Bộ nhớ tạm "cắt sản phẩm" của admin: lưu trong localStorage để giữ được
 * khi chuyển trang, và đồng bộ giữa các component bằng sự kiện tuỳ chỉnh.
 */
import { useEffect, useState } from "react";

export type ClipboardItem = { id: string; name: string };

const KEY = "product-clipboard";
const EVENT = "product-clipboard-change";

const read = (): ClipboardItem | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ClipboardItem) : null;
  } catch {
    return null;
  }
};

export const cutProduct = (item: ClipboardItem) => {
  window.localStorage.setItem(KEY, JSON.stringify(item));
  window.dispatchEvent(new Event(EVENT));
};

export const clearClipboard = () => {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
};

export function useProductClipboard() {
  const [item, setItem] = useState<ClipboardItem | null>(null);

  useEffect(() => {
    const sync = () => setItem(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return item;
}
