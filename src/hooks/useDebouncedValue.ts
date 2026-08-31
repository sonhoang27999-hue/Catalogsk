import { useEffect, useState } from "react";

/** Trì hoãn giá trị (mặc định 300ms) để không bắn request theo từng phím gõ. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
