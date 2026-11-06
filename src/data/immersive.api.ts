/**
 * Dữ liệu SKLIGHT Immersive Viewer.
 * - Bản nháp: kho riêng tư "immersive-drafts" (chỉ admin/quản trị viên).
 * - Đã xuất bản: tệp được SAO CHÉP sang kho "immersive-media"; khách đọc qua link ký tạm thời.
 * Không đụng tới bảng sản phẩm.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  LIMITS,
  MEDIA_KEYS,
  fitWidth,
  sanitizeLedPreset,
  sanitizeModelHotspots,
  sanitizePanoHotspots,
  type LedPreset,
  type ModelHotspot,
  type PanoHotspot,
  type SceneKind,
  type SceneMedia,
  type SceneStatus,
} from "@/lib/immersive";

export const DRAFT_BUCKET = "immersive-drafts";
export const PUBLIC_BUCKET = "immersive-media";

export type ImmersiveScope = { seriesId?: string; nodeId?: string };

export type ImmersiveScene = {
  id: string;
  seriesId: string | null;
  nodeId: string | null;
  productId: string | null;
  kind: SceneKind;
  status: SceneStatus;
  title: string;
  caption: string | null;
  sort: number;
  draftMedia: SceneMedia;
  publishedMedia: SceneMedia;
  videoUrl: string | null;
  panoHotspots: PanoHotspot[];
  modelHotspots: ModelHotspot[];
  led: LedPreset;
  meta: Record<string, unknown>;
};

const asMedia = (v: unknown): SceneMedia => {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const out: SceneMedia = {};
  for (const k of MEDIA_KEYS) if (typeof o[k] === "string") out[k] = o[k] as string;
  return out;
};

type Row = {
  id: string;
  series_id: string | null;
  node_id: string | null;
  product_id: string | null;
  kind: string;
  status: string;
  title: string;
  caption: string | null;
  sort: number;
  draft_media: Json;
  published_media: Json;
  video_url: string | null;
  hotspots: Json;
  led_presets: Json;
  meta: Json;
};

function toScene(r: Row): ImmersiveScene {
  return {
    id: r.id,
    seriesId: r.series_id,
    nodeId: r.node_id,
    productId: r.product_id,
    kind: r.kind as SceneKind,
    status: r.status as SceneStatus,
    title: r.title,
    caption: r.caption,
    sort: r.sort,
    draftMedia: asMedia(r.draft_media),
    publishedMedia: asMedia(r.published_media),
    videoUrl: r.video_url,
    panoHotspots: r.kind === "panorama" ? sanitizePanoHotspots(r.hotspots) : [],
    modelHotspots: r.kind === "model" ? sanitizeModelHotspots(r.hotspots) : [],
    led: sanitizeLedPreset(r.led_presets),
    meta: (r.meta && typeof r.meta === "object" ? r.meta : {}) as Record<string, unknown>,
  };
}

const COLS =
  "id, series_id, node_id, product_id, kind, status, title, caption, sort, draft_media, published_media, video_url, hotspots, led_presets, meta";

export const immersiveKey = (scope: ImmersiveScope) =>
  ["immersive", scope.seriesId ?? "", scope.nodeId ?? ""] as const;

/** Khách chỉ nhận cảnh đã xuất bản (RLS). Admin nhận cả bản nháp. */
export async function listScenes(scope: ImmersiveScope): Promise<ImmersiveScene[]> {
  let q = supabase.from("immersive_scenes").select(COLS);
  if (scope.seriesId) q = q.eq("series_id", scope.seriesId);
  else if (scope.nodeId) q = q.eq("node_id", scope.nodeId);
  else return [];
  const { data, error } = await q.order("sort").order("created_at");
  if (error) throw error;
  return (data as Row[]).map(toScene);
}

/** Link ký tạm thời (6 giờ) cho nhiều tệp cùng lúc. */
export async function signPaths(bucket: string, paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, 6 * 3600);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const d of data ?? []) if (d.signedUrl && d.path) out[d.path] = d.signedUrl;
  return out;
}

export function mediaPaths(media: SceneMedia): string[] {
  return MEDIA_KEYS.map((k) => media[k]).filter((p): p is string => Boolean(p));
}

/* ----------------------------- Quản trị ----------------------------- */

export async function createScene(input: {
  scope: ImmersiveScope;
  kind: SceneKind;
  title: string;
  caption?: string;
  productId?: string | null;
  sort: number;
}): Promise<string> {
  const { data, error } = await supabase
    .from("immersive_scenes")
    .insert({
      series_id: input.scope.seriesId ?? null,
      node_id: input.scope.nodeId ?? null,
      product_id: input.productId ?? null,
      kind: input.kind,
      title: input.title,
      caption: input.caption || null,
      sort: input.sort,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateScene(
  id: string,
  patch: Partial<{
    title: string;
    caption: string | null;
    productId: string | null;
    sort: number;
    videoUrl: string | null;
    draftMedia: SceneMedia;
    hotspots: PanoHotspot[] | ModelHotspot[];
    led: LedPreset;
    meta: Record<string, unknown>;
  }>,
) {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row["title"] = patch.title;
  if (patch.caption !== undefined) row["caption"] = patch.caption;
  if (patch.productId !== undefined) row["product_id"] = patch.productId;
  if (patch.sort !== undefined) row["sort"] = patch.sort;
  if (patch.videoUrl !== undefined) row["video_url"] = patch.videoUrl;
  if (patch.draftMedia !== undefined) row["draft_media"] = patch.draftMedia;
  if (patch.hotspots !== undefined) row["hotspots"] = patch.hotspots;
  if (patch.led !== undefined) row["led_presets"] = patch.led;
  if (patch.meta !== undefined) row["meta"] = patch.meta;
  const { error } = await supabase.from("immersive_scenes").update(row as never).eq("id", id);
  if (error) throw error;
}

export async function uploadDraft(sceneId: string, role: string, blob: Blob, ext: string): Promise<string> {
  const path = `${sceneId}/${role}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(DRAFT_BUCKET)
    .upload(path, blob, { contentType: blob.type || "application/octet-stream", upsert: false, cacheControl: "31536000" });
  if (error) throw error;
  return path;
}

/** Xuất bản: chép tệp nháp sang kho công khai, rồi mới đổi trạng thái. */
export async function publishScene(scene: ImmersiveScene) {
  const next: SceneMedia = {};
  const copied: string[] = [];
  for (const k of MEDIA_KEYS) {
    const path = scene.draftMedia[k];
    if (!path) continue;
    if (scene.publishedMedia[k] !== path) {
      const { error } = await supabase.storage
        .from(DRAFT_BUCKET)
        .copy(path, path, { destinationBucket: PUBLIC_BUCKET });
      if (error && !/exists/i.test(error.message)) {
        if (copied.length) await supabase.storage.from(PUBLIC_BUCKET).remove(copied);
        throw error;
      }
      copied.push(path);
    }
    next[k] = path;
  }
  const { error } = await supabase
    .from("immersive_scenes")
    .update({ status: "published", published_media: next as Json })
    .eq("id", scene.id);
  if (error) {
    if (copied.length) await supabase.storage.from(PUBLIC_BUCKET).remove(copied);
    throw error;
  }
  const stale = mediaPaths(scene.publishedMedia).filter((p) => !mediaPaths(next).includes(p));
  if (stale.length) await supabase.storage.from(PUBLIC_BUCKET).remove(stale);
}

export async function unpublishScene(scene: ImmersiveScene) {
  const { error } = await supabase
    .from("immersive_scenes")
    .update({ status: "draft", published_media: {} })
    .eq("id", scene.id);
  if (error) throw error;
  const paths = mediaPaths(scene.publishedMedia);
  if (paths.length) await supabase.storage.from(PUBLIC_BUCKET).remove(paths);
}

export async function deleteScene(scene: ImmersiveScene) {
  const { error } = await supabase.from("immersive_scenes").delete().eq("id", scene.id);
  if (error) throw error;
  const pub = mediaPaths(scene.publishedMedia);
  if (pub.length) await supabase.storage.from(PUBLIC_BUCKET).remove(pub);
  const draft = mediaPaths(scene.draftMedia);
  if (draft.length) await supabase.storage.from(DRAFT_BUCKET).remove(draft);
}

/** Xóa tệp nháp cũ không còn dùng (không động tới bản đã xuất bản). */
export async function removeDraftFiles(paths: string[], keep: SceneMedia, published: SceneMedia) {
  const protectedSet = new Set([...mediaPaths(keep), ...mediaPaths(published)]);
  const remove = paths.filter((p) => p && !protectedSet.has(p));
  if (remove.length) await supabase.storage.from(DRAFT_BUCKET).remove(remove);
}

/* --------------------------- Xử lý ảnh tại máy --------------------------- */

export function imageSize(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được ảnh."));
    };
    img.src = url;
  });
}

/** Thu nhỏ ảnh ngay trên máy (không phóng to), trả về JPEG/WebP. */
export async function resizeImage(
  file: Blob,
  source: { width: number; height: number },
  maxWidth: number,
  type: "image/jpeg" | "image/webp",
  quality: number,
): Promise<Blob> {
  const size = fitWidth(source.width, source.height, maxWidth);
  const bitmap = await createImageBitmap(file, {
    resizeWidth: size.width,
    resizeHeight: size.height,
    resizeQuality: "high",
  });
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
  // Safari có thể bỏ qua resizeWidth → luôn vẽ co giãn đúng khung để không bị cắt ảnh.
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, type, quality));
  canvas.width = canvas.height = 0;
  if (!blob) throw new Error("Không nén được ảnh.");
  return blob;
}

export const POSTER_WIDTH = LIMITS.posterWidth;
