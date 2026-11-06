/**
 * Quy tắc thuần cho SKLIGHT Immersive Viewer (không phụ thuộc React/three).
 * Dùng chung cho trang công khai, trình quản trị và bài kiểm tra.
 */

export type SceneKind = "panorama" | "model" | "photo" | "video" | "compare";
export type SceneStatus = "draft" | "published";

/** Đường dẫn tệp trong kho (bản nháp hoặc bản đã xuất bản). */
export type SceneMedia = {
  /** Ảnh gốc / file GLB / video mp4 / ảnh "trước". */
  original?: string;
  /** Bản hiển thị đã thu gọn (panorama ≤ 4096px, ảnh ≤ 1600px). */
  display?: string;
  /** Ảnh nhỏ xem trước. */
  poster?: string;
  /** Ảnh "sau" cho so sánh trước/sau. */
  after?: string;
};

export type PanoHotspot = {
  id: string;
  label: string;
  yaw: number;
  pitch: number;
  /** Bấm vào sẽ chuyển sang cảnh 360° khác (góc cabin khác). */
  targetSceneId?: string | null;
  kind?: "info" | "link" | "led";
};

export type ModelHotspot = {
  id: string;
  label: string;
  position: [number, number, number];
};

export type LedEffect = "static" | "breathing" | "chase" | "rainbow";

export type LedScenePreset = {
  id: string;
  name: string;
  effect: LedEffect;
  color: string;
  brightness: number;
  /** Màu riêng theo vùng (tên material) — ghi đè màu chung. */
  zoneColors: Record<string, string>;
};

export type LedPreset = {
  /** Tên material trong file GLB được phép đổi màu. Rỗng = không hỗ trợ đổi màu. */
  materials: string[];
  colors: string[];
  /** Kịch bản LED đã lưu (V3). */
  presets: LedScenePreset[];
};

export const LED_EFFECT_LABEL: Record<LedEffect, string> = {
  static: "Tĩnh",
  breathing: "Nhịp thở",
  chase: "Chạy đuổi",
  rainbow: "Đổi màu liên tục",
};

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Cường độ & sắc độ của vùng LED thứ `index` (trong `count` vùng) tại thời điểm `t` giây.
 * Trả về hệ số độ sáng 0..1 và độ lệch màu (hue 0..1, chỉ dùng cho rainbow).
 */
export function ledFrame(effect: LedEffect, t: number, index: number, count: number): { level: number; hue: number | null } {
  const n = Math.max(1, count);
  switch (effect) {
    case "breathing":
      return { level: 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.2)), hue: null };
    case "chase": {
      const head = (t * 1.6) % n;
      const d = Math.min(Math.abs(index - head), n - Math.abs(index - head));
      return { level: Math.max(0.12, 1 - d * 0.7), hue: null };
    }
    case "rainbow":
      return { level: 1, hue: (t * 0.08 + index / n) % 1 };
    default:
      return { level: 1, hue: null };
  }
}

/** Gợi ý vùng LED: material có tag `sklightLed`/`led` trong extras glTF hoặc tên bắt đầu bằng LED. */
export function isTaggedLed(name: string, extras: Record<string, unknown> | undefined): boolean {
  if (extras && (extras["sklightLed"] === true || extras["led"] === true || extras["sklight_led"] === true)) return true;
  return /^led[_\-\s]/i.test(name);
}

export const MEDIA_KEYS = ["original", "display", "poster", "after"] as const;

export const LIMITS = {
  panoramaMaxBytes: 50 * 1024 * 1024,
  panoramaMinWidth: 2048,
  panoramaRecommendedWidth: 4096,
  panoramaDisplayWidth: 4096,
  modelMaxBytes: 50 * 1024 * 1024,
  photoMaxBytes: 20 * 1024 * 1024,
  videoMaxBytes: 50 * 1024 * 1024,
  photoDisplayWidth: 1600,
  posterWidth: 640,
} as const;

/** Tỉ lệ chuẩn equirectangular là đúng 2:1 (cho phép sai lệch 1%). */
export function isEquirectangular(width: number, height: number): boolean {
  if (!(width > 0 && height > 0)) return false;
  return Math.abs(width / height - 2) <= 0.02;
}

export type Check = { ok: boolean; error?: string; warning?: string };

export function checkPanorama(file: { type: string; size: number }, width: number, height: number): Check {
  if (!["image/jpeg", "image/webp"].includes(file.type))
    return { ok: false, error: "Ảnh 360° phải là JPEG hoặc WebP." };
  if (file.size > LIMITS.panoramaMaxBytes)
    return { ok: false, error: "Ảnh 360° tối đa 50MB." };
  if (!isEquirectangular(width, height))
    return {
      ok: false,
      error: `Ảnh ${width}×${height} không phải ảnh cầu 360° (cần tỉ lệ đúng 2:1). Ảnh panorama ngang chụp bằng chế độ Pano của điện thoại không dùng được.`,
    };
  if (width < LIMITS.panoramaMinWidth)
    return { ok: false, error: `Ảnh quá nhỏ (${width}px). Cần tối thiểu ${LIMITS.panoramaMinWidth}px chiều ngang.` };
  if (width < LIMITS.panoramaRecommendedWidth)
    return { ok: true, warning: "Ảnh hơi nhỏ, khi phóng to có thể mờ. Nên dùng ảnh từ 4096px trở lên." };
  return { ok: true };
}

export function checkModelFile(file: { name: string; size: number }): Check {
  if (!/\.glb$/i.test(file.name)) return { ok: false, error: "Mô hình 3D phải là file .glb (glTF nhị phân)." };
  if (file.size > LIMITS.modelMaxBytes) return { ok: false, error: "File 3D tối đa 50MB." };
  return { ok: true };
}

export function checkPhotoFile(file: { type: string; size: number }): Check {
  if (!["image/jpeg", "image/webp", "image/png"].includes(file.type))
    return { ok: false, error: "Ảnh phải là JPEG, WebP hoặc PNG." };
  if (file.size > LIMITS.photoMaxBytes) return { ok: false, error: "Ảnh tối đa 20MB." };
  return { ok: true };
}

export function checkVideoFile(file: { type: string; size: number }): Check {
  if (file.type !== "video/mp4") return { ok: false, error: "Video tải lên phải là MP4." };
  if (file.size > LIMITS.videoMaxBytes) return { ok: false, error: "Video tối đa 50MB. Video dài hãy dán link YouTube." };
  return { ok: true };
}

/** Một cảnh có đủ dữ liệu để khách xem hay không — thiếu thì không hiển thị. */
export function sceneHasMedia(kind: SceneKind, media: SceneMedia, videoUrl?: string | null): boolean {
  switch (kind) {
    case "panorama":
      return Boolean(media.display || media.original);
    case "model":
      return Boolean(media.original);
    case "photo":
      return Boolean(media.display || media.original);
    case "compare":
      return Boolean((media.display || media.original) && media.after);
    case "video":
      return Boolean(media.original || (videoUrl && videoUrl.trim()));
  }
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function sanitizePanoHotspots(raw: unknown): PanoHotspot[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((h): PanoHotspot[] => {
    if (!h || typeof h !== "object") return [];
    const o = h as Record<string, unknown>;
    const yaw = Number(o["yaw"]);
    const pitch = Number(o["pitch"]);
    if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return [];
    const target = typeof o["targetSceneId"] === "string" ? (o["targetSceneId"] as string) : null;
    return [
      {
        id: typeof o["id"] === "string" ? (o["id"] as string) : `${yaw.toFixed(3)}_${pitch.toFixed(3)}`,
        label: String(o["label"] ?? "").slice(0, 80),
        yaw,
        pitch: clamp(pitch, -Math.PI / 2, Math.PI / 2),
        targetSceneId: target,
        kind: target ? "link" : o["kind"] === "led" ? "led" : "info",
      },
    ];
  });
}

export function sanitizeModelHotspots(raw: unknown): ModelHotspot[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((h): ModelHotspot[] => {
    if (!h || typeof h !== "object") return [];
    const o = h as Record<string, unknown>;
    const p = o["position"];
    if (!Array.isArray(p) || p.length !== 3 || !p.every((n) => Number.isFinite(Number(n)))) return [];
    return [
      {
        id: typeof o["id"] === "string" ? (o["id"] as string) : p.join("_"),
        label: String(o["label"] ?? "").slice(0, 80),
        position: [Number(p[0]), Number(p[1]), Number(p[2])],
      },
    ];
  });
}

export function sanitizeLedPreset(raw: unknown): LedPreset {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const materials = Array.isArray(o["materials"])
    ? (o["materials"] as unknown[]).filter((m): m is string => typeof m === "string" && m.length > 0)
    : [];
  const colors = Array.isArray(o["colors"])
    ? (o["colors"] as unknown[]).filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c))
    : [];
  const presets = Array.isArray(o["presets"])
    ? (o["presets"] as unknown[]).flatMap((p): LedScenePreset[] => {
        if (!p || typeof p !== "object") return [];
        const q = p as Record<string, unknown>;
        const effect = (["static", "breathing", "chase", "rainbow"] as const).find((e) => e === q["effect"]) ?? "static";
        const color = typeof q["color"] === "string" && HEX.test(q["color"]) ? q["color"] : "#bf5af2";
        const zc = q["zoneColors"] && typeof q["zoneColors"] === "object" ? (q["zoneColors"] as Record<string, unknown>) : {};
        const zoneColors: Record<string, string> = {};
        for (const [k, v] of Object.entries(zc)) if (typeof v === "string" && HEX.test(v) && materials.includes(k)) zoneColors[k] = v;
        return [
          {
            id: typeof q["id"] === "string" ? q["id"] : String(Math.random()).slice(2, 10),
            name: String(q["name"] ?? "").slice(0, 40) || "Kịch bản",
            effect,
            color,
            brightness: Math.min(4, Math.max(0, Number(q["brightness"]) || 1.5)),
            zoneColors,
          },
        ];
      })
    : [];
  return { materials, colors: colors.length ? colors : DEFAULT_LED_COLORS, presets: presets.slice(0, 12) };
}

export const DEFAULT_LED_COLORS = ["#bf5af2", "#ffffff", "#ff2d55", "#ff9500", "#ffd60a", "#30d158", "#0a84ff"];

/** Màu LED thể hiện trong ẢNH THẬT của cảnh 360° (do admin gắn), ví dụ Tím / Purple. */
export const PANO_LED_TAGS: { id: string; label: string; color: string }[] = [
  { id: "purple", label: "Tím (Purple)", color: "#bf5af2" },
  { id: "white", label: "Trắng", color: "#ffffff" },
  { id: "blue", label: "Xanh dương", color: "#0a84ff" },
  { id: "red", label: "Đỏ", color: "#ff2d55" },
  { id: "amber", label: "Vàng hổ phách", color: "#ff9500" },
  { id: "green", label: "Xanh lá", color: "#30d158" },
  { id: "multi", label: "Đa màu", color: "#ff2d55" },
];

/**
 * Chỉ bật bảng đổi màu LED khi model THỰC SỰ có material được cấu hình.
 * Không có khớp → không quảng cáo đổi màu.
 */
export function matchLedMaterials(configured: string[], available: string[]): string[] {
  const set = new Set(available);
  return configured.filter((m) => set.has(m));
}

/** Kích thước thu gọn giữ tỉ lệ, không phóng to. */
export function fitWidth(width: number, height: number, maxWidth: number): { width: number; height: number } {
  if (width <= maxWidth) return { width, height };
  return { width: maxWidth, height: Math.round((height * maxWidth) / width) };
}

export const KIND_LABEL: Record<SceneKind, string> = {
  panorama: "Ảnh 360°",
  model: "Mô hình 3D",
  photo: "Ảnh thực tế",
  video: "Video thực tế",
  compare: "Trước / Sau",
};

/** Nút quản trị cho một cảnh: đã xuất bản luôn có "Ẩn"; có tệp mới thì thêm "Xuất bản bản mới". */
export function sceneActions(status: SceneStatus, changed: boolean): { unpublish: boolean; publish: boolean; republish: boolean } {
  if (status === "published") return { unpublish: true, publish: false, republish: changed };
  return { unpublish: false, publish: true, republish: false };
}

export type TaggedScene = { id: string; title: string; tag: string };

/**
 * Chọn ảnh thật cho chip màu LED. Có tiêu đề (góc nhìn) → chỉ cảnh cùng góc + cùng màu, không có thì null
 * (chip bị khoá). Cảnh hiện tại không có tiêu đề → giữ fallback cũ: cảnh bất kỳ có màu đó.
 */
export function pickSceneForTag(scenes: TaggedScene[], current: TaggedScene, tag: string): string | null {
  if (current.title) return scenes.find((s) => s.tag === tag && s.title === current.title)?.id ?? null;
  return scenes.find((s) => s.tag === tag)?.id ?? null;
}

/** Hotspot A → B: nếu A có màu LED và có cảnh cùng tiêu đề với B, cùng màu với A thì sang cảnh đó. */
export function mapSceneForNavigation(scenes: TaggedScene[], fromId: string, targetId: string): string {
  const from = scenes.find((s) => s.id === fromId);
  const target = scenes.find((s) => s.id === targetId);
  if (!from?.tag || !target || target.tag === from.tag) return targetId;
  return scenes.find((s) => s.title === target.title && s.tag === from.tag)?.id ?? targetId;
}

/**
 * Chọn cảnh panorama giữ lại trong bộ nhớ: cảnh đang xem + tối đa 1 cảnh liền trước.
 * `recent` là danh sách id theo thứ tự xem gần nhất trước. Trả về thứ tự mới và id cần hủy.
 */
export function planSceneRetention(recent: string[], currentId: string, maxKeep = 2): { keep: string[]; drop: string[] } {
  const order = [currentId, ...recent.filter((id) => id !== currentId)];
  const n = Math.max(1, maxKeep);
  return { keep: order.slice(0, n), drop: order.slice(n) };
}
