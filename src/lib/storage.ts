/**
 * Local-only key/value persistence. All app data lives on this device.
 * Swap `LocalStorageDriver` for an IndexedDB / SQLite / CoreData driver later —
 * the rest of the app only talks to the `KVStore` interface.
 */
export interface KVStore {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  clear(): void;
}

const PREFIX = "sk-translate:";

class LocalStorageDriver implements KVStore {
  private ok() {
    try {
      return typeof window !== "undefined" && !!window.localStorage;
    } catch {
      return false;
    }
  }
  get<T>(key: string): T | undefined {
    if (!this.ok()) return undefined;
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }
  set<T>(key: string, value: T) {
    if (!this.ok()) return;
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }
  clear() {
    if (!this.ok()) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  }
}

export const kv: KVStore = new LocalStorageDriver();

/** Binary cache (e.g. OpenAI voice audio) in IndexedDB, local to this device. */
export interface BlobStore {
  get(key: string): Promise<Blob | undefined>;
  set(key: string, value: Blob): Promise<void>;
  clear(): Promise<void>;
}

function idb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((ok) => {
    const r = indexedDB.open("sk-translate", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("blobs");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ok(null);
  });
}
function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T | undefined> {
  return idb().then((db) => new Promise((ok) => {
    if (!db) return ok(undefined);
    const t = db.transaction("blobs", mode);
    const req = fn(t.objectStore("blobs"));
    t.oncomplete = () => ok(req ? (req.result as T) : undefined);
    t.onerror = () => ok(undefined);
  }));
}
export const blobs: BlobStore = {
  get: (k) => tx<Blob>("readonly", (s) => s.get(k)),
  set: (k, v) => tx<void>("readwrite", (s) => { s.put(v, k); }).then(() => {}),
  clear: () => tx<void>("readwrite", (s) => { s.clear(); }).then(() => {}),
};
