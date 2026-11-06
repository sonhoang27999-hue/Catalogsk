/**
 * Quản trị SKLIGHT Immersive (chỉ admin/quản trị viên; RLS kiểm tra lại ở máy chủ).
 * Nạp động khi bấm "Quản lý" để không làm nặng trang khách.
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, MapPin, Pencil, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DRAFT_BUCKET,
  POSTER_WIDTH,
  createScene,
  deleteScene,
  imageSize,
  immersiveKey,
  listScenes,
  mediaPaths,
  publishScene,
  removeDraftFiles,
  resizeImage,
  signPaths,
  unpublishScene,
  updateScene,
  uploadDraft,
  type ImmersiveScene,
  type ImmersiveScope,
} from "@/data/immersive.api";
import {
  KIND_LABEL,
  LIMITS,
  checkModelFile,
  checkPanorama,
  checkPhotoFile,
  checkVideoFile,
  sceneHasMedia,
  sceneActions,
  LED_EFFECT_LABEL,
  PANO_LED_TAGS,
  type LedScenePreset,
  type ModelHotspot,
  type PanoHotspot,
  type SceneKind,
  type SceneMedia,
} from "@/lib/immersive";
import { toEmbedUrl } from "@/lib/video";
import { hasWebGL } from "@/lib/webgl";

const PanoramaViewer = lazy(() => import("./PanoramaViewer"));
const ModelViewer = lazy(() => import("./ModelViewer"));

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scope: ImmersiveScope;
  targetName: string;
  products: { dbId: string; name: string }[];
};

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Có lỗi xảy ra");
const newId = () => Math.random().toString(36).slice(2, 10);

export default function ImmersiveManager({ open, onOpenChange, scope, targetName, products }: Props) {
  const qc = useQueryClient();
  const key = immersiveKey(scope);
  const scenesQ = useQuery({ queryKey: key, queryFn: () => listScenes(scope) });
  const scenes = scenesQ.data ?? [];
  const [tab, setTab] = useState("list");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: key });

  const run = async (id: string, fn: () => Promise<void>, ok: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
      await refresh();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const a = scenes[i];
    const b = scenes[i + dir];
    if (!a || !b) return;
    void run(
      a.id,
      async () => {
        await updateScene(a.id, { sort: b.sort === a.sort ? a.sort + dir : b.sort });
        await updateScene(b.id, { sort: a.sort });
      },
      "Đã đổi thứ tự.",
    );
  };

  const editingScene = scenes.find((s) => s.id === editing) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle>360° / 3D / ảnh thực tế — {targetName}</DialogTitle>
          <DialogDescription>
            Bản nháp chỉ admin thấy. Bấm "Xuất bản" để khách xem được.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Danh sách</TabsTrigger>
            <TabsTrigger value="add">Thêm mới</TabsTrigger>
            <TabsTrigger value="guide">Hướng dẫn chụp</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-2 pt-2">
            {scenesQ.isLoading ? <p className="text-sm text-muted-foreground">Đang tải…</p> : null}
            {!scenesQ.isLoading && scenes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Chưa có nội dung. Khách sẽ không thấy khối này cho tới khi có mục đã xuất bản.
              </p>
            ) : null}
            {scenes.map((s, i) => {
              const ready = sceneHasMedia(s.kind, s.draftMedia, s.videoUrl);
              const changed =
                s.status === "published" && mediaPaths(s.draftMedia).join() !== mediaPaths(s.publishedMedia).join();
              const act = sceneActions(s.status, changed);
              return (
                <div key={s.id} className="rounded-lg border border-border p-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{KIND_LABEL[s.kind]}</Badge>
                    <Badge variant={s.status === "published" ? "default" : "secondary"}>
                      {s.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                    </Badge>
                    {changed ? <Badge variant="destructive">Có tệp mới chưa xuất bản</Badge> : null}
                    {!ready ? <Badge variant="destructive">Thiếu tệp</Badge> : null}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.title || "(chưa đặt tên)"}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap justify-end gap-1">
                    <Button size="icon" variant="ghost" aria-label="Lên" disabled={i === 0 || !!busy} onClick={() => move(i, -1)}>
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Xuống" disabled={i === scenes.length - 1 || !!busy} onClick={() => move(i, 1)}>
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(editing === s.id ? null : s.id)}>
                      <Pencil className="size-3.5" /> Sửa
                    </Button>
                    {act.unpublish ? (
                      <Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => run(s.id, () => unpublishScene(s), "Đã ẩn khỏi khách.")}>
                        <EyeOff className="size-3.5" /> Ẩn
                      </Button>
                    ) : null}
                    {act.publish || act.republish ? (
                      <Button size="sm" disabled={!ready || busy === s.id} onClick={() => run(s.id, () => publishScene(s), "Đã xuất bản.")}>
                        {busy === s.id ? <Loader2 className="size-3.5 animate-spin" /> : <Eye className="size-3.5" />}{" "}
                        {act.republish ? "Xuất bản bản mới" : "Xuất bản"}
                      </Button>
                    ) : null}
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Xóa"
                      disabled={busy === s.id}
                      onClick={() => {
                        if (window.confirm(`Xóa "${s.title || KIND_LABEL[s.kind]}" và các tệp của mục này?`))
                          void run(s.id, () => deleteScene(s), "Đã xóa.");
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                  {editing === s.id && editingScene ? (
                    <SceneEditor key={s.id} scene={editingScene} all={scenes} products={products} onSaved={refresh} />
                  ) : null}
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="add" className="pt-2">
            <AddScene
              scope={scope}
              products={products}
              nextSort={(scenes.at(-1)?.sort ?? -1) + 1}
              onCreated={async (id) => {
                await refresh();
                setEditing(id);
                setTab("list");
              }}
            />
          </TabsContent>

          <TabsContent value="guide" className="pt-2">
            <CaptureGuide />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function ProductSelect({ value, onChange, products }: { value: string; onChange: (v: string) => void; products: { dbId: string; name: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      aria-label="Gắn với sản phẩm"
    >
      <option value="">Cả dòng xe (không gắn sản phẩm)</option>
      {products.map((p) => (
        <option key={p.dbId} value={p.dbId}>
          {p.name || "(sản phẩm chưa đặt tên)"}
        </option>
      ))}
    </select>
  );
}

function AddScene({
  scope,
  products,
  nextSort,
  onCreated,
}: {
  scope: ImmersiveScope;
  products: { dbId: string; name: string }[];
  nextSort: number;
  onCreated: (id: string) => void;
}) {
  const [kind, setKind] = useState<SceneKind>("panorama");
  const [title, setTitle] = useState("");
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {(Object.keys(KIND_LABEL) as SceneKind[]).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-md border px-2 py-2 text-xs font-semibold ${kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </div>
      <Input placeholder="Tiêu đề, ví dụ: Táp-lô ban đêm, Hàng ghế sau…" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
      <ProductSelect value={productId} onChange={setProductId} products={products} />
      <Button
        className="w-full"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          try {
            const id = await createScene({ scope, kind, title: title.trim(), productId: productId || null, sort: nextSort });
            toast.success("Đã tạo bản nháp. Hãy tải tệp lên.");
            onCreated(id);
          } catch (e) {
            toast.error(errMsg(e));
          } finally {
            setSaving(false);
          }
        }}
      >
        Tạo bản nháp
      </Button>
    </div>
  );
}

function FilePick({ label, accept, onFile, disabled }: { label: string; accept: string; onFile: (f: File) => void; disabled?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm ${disabled ? "opacity-50" : ""}`}>
      <Upload className="size-4 text-primary" />
      <span className="flex-1">{label}</span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) onFile(f);
        }}
      />
    </label>
  );
}

function SceneEditor({
  scene,
  all,
  products,
  onSaved,
}: {
  scene: ImmersiveScene;
  all: ImmersiveScene[];
  products: { dbId: string; name: string }[];
  onSaved: () => Promise<unknown>;
}) {
  const [title, setTitle] = useState(scene.title);
  const [caption, setCaption] = useState(scene.caption ?? "");
  const [productId, setProductId] = useState(scene.productId ?? "");
  const [videoUrl, setVideoUrl] = useState(scene.videoUrl ?? "");
  const [pano, setPano] = useState<PanoHotspot[]>(scene.panoHotspots);
  const [modelHs, setModelHs] = useState<ModelHotspot[]>(scene.modelHotspots);
  const [ledMaterials, setLedMaterials] = useState<string[]>(scene.led.materials);
  const [available, setAvailable] = useState<string[]>([]);
  const [tagged, setTagged] = useState<string[]>([]);
  const [presets, setPresets] = useState<LedScenePreset[]>(scene.led.presets);
  const [ledTag, setLedTag] = useState<string>(typeof scene.meta["ledTag"] === "string" ? (scene.meta["ledTag"] as string) : "");
  const [placing, setPlacing] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  const urlsQ = useQuery({
    queryKey: ["immersive-draft-urls", mediaPaths(scene.draftMedia).join(",")],
    queryFn: () => signPaths(DRAFT_BUCKET, mediaPaths(scene.draftMedia)),
    enabled: mediaPaths(scene.draftMedia).length > 0,
    staleTime: 3600_000,
  });
  const url = (p?: string) => (p ? urlsQ.data?.[p] : undefined);

  const saveMedia = async (next: SceneMedia, meta?: Record<string, unknown>) => {
    const old = mediaPaths(scene.draftMedia);
    await updateScene(scene.id, { draftMedia: next, ...(meta ? { meta: { ...scene.meta, ...meta } } : {}) });
    await removeDraftFiles(old, next, scene.publishedMedia);
    await onSaved();
  };

  const upload = async (role: string, file: File) => {
    setUploading(role);
    try {
      const next: SceneMedia = { ...scene.draftMedia };
      let meta: Record<string, unknown> | undefined;
      if (scene.kind === "panorama") {
        const size = await imageSize(file);
        const check = checkPanorama(file, size.width, size.height);
        if (!check.ok) throw new Error(check.error);
        if (check.warning) toast.warning(check.warning);
        const display = await resizeImage(file, size, LIMITS.panoramaDisplayWidth, "image/jpeg", 0.86);
        const poster = await resizeImage(file, size, POSTER_WIDTH, "image/webp", 0.72);
        const ext = file.type === "image/webp" ? "webp" : "jpg";
        next.original = await uploadDraft(scene.id, "original", file, ext);
        next.display = await uploadDraft(scene.id, "display", display, "jpg");
        next.poster = await uploadDraft(scene.id, "poster", poster, "webp");
        meta = { width: size.width, height: size.height, displayWidth: Math.min(size.width, LIMITS.panoramaDisplayWidth), bytes: file.size };
      } else if (scene.kind === "model" && role === "original") {
        const check = checkModelFile(file);
        if (!check.ok) throw new Error(check.error);
        next.original = await uploadDraft(scene.id, "model", new Blob([file], { type: "model/gltf-binary" }), "glb");
        meta = { bytes: file.size };
      } else if (scene.kind === "video" && role === "original") {
        const check = checkVideoFile(file);
        if (!check.ok) throw new Error(check.error);
        next.original = await uploadDraft(scene.id, "video", file, "mp4");
      } else {
        const check = checkPhotoFile(file);
        if (!check.ok) throw new Error(check.error);
        const size = await imageSize(file);
        if (role === "poster") {
          next.poster = await uploadDraft(scene.id, "poster", await resizeImage(file, size, POSTER_WIDTH, "image/webp", 0.72), "webp");
        } else {
          const display = await resizeImage(file, size, LIMITS.photoDisplayWidth, "image/webp", 0.82);
          const path = await uploadDraft(scene.id, role, display, "webp");
          if (role === "after") next.after = path;
          else {
            next.display = path;
            if (!next.poster)
              next.poster = await uploadDraft(scene.id, "poster", await resizeImage(file, size, POSTER_WIDTH, "image/webp", 0.72), "webp");
          }
        }
      }
      await saveMedia(next, meta);
      toast.success("Đã tải lên bản nháp.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (scene.kind === "video" && videoUrl.trim() && !toEmbedUrl(videoUrl)) {
      toast.error("Link video chưa đúng (YouTube, TikTok, Facebook, Google Drive).");
      return;
    }
    setSaving(true);
    try {
      await updateScene(scene.id, {
        title: title.trim(),
        caption: caption.trim() || null,
        productId: productId || null,
        videoUrl: scene.kind === "video" ? videoUrl.trim() || null : scene.videoUrl,
        ...(scene.kind === "panorama" ? { hotspots: pano } : {}),
        ...(scene.kind === "model" ? { hotspots: modelHs, led: { materials: ledMaterials, colors: scene.led.colors, presets } } : {}),
        ...(scene.kind === "panorama" ? { meta: { ...scene.meta, ledTag: ledTag || null } } : {}),
      });
      await onSaved();
      toast.success(scene.status === "published" ? "Đã lưu — khách thấy thay đổi ngay." : "Đã lưu bản nháp.");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const otherPanos = all.filter((s) => s.kind === "panorama" && s.id !== scene.id);
  const panoData = useMemo(
    () => [
      {
        id: scene.id,
        title: scene.title,
        url: url(scene.draftMedia.display) ?? "",
        width: Number(scene.meta["displayWidth"]) || LIMITS.panoramaDisplayWidth,
        hotspots: pano,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scene.id, urlsQ.data, pano],
  );

  const canPreview =
    (scene.kind === "panorama" && url(scene.draftMedia.display)) || (scene.kind === "model" && url(scene.draftMedia.original));

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tiêu đề" maxLength={120} />
      <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Chú thích (không bắt buộc)" rows={2} />
      <ProductSelect value={productId} onChange={setProductId} products={products} />

      <div className="space-y-1.5">
        {scene.kind === "panorama" ? (
          <FilePick label={uploading ? "Đang xử lý ảnh…" : "Tải ảnh cầu 360° (JPEG/WebP, tỉ lệ 2:1, ≤ 50MB)"} accept="image/jpeg,image/webp" disabled={!!uploading} onFile={(f) => upload("original", f)} />
        ) : null}
        {scene.kind === "model" ? (
          <>
            <FilePick label={uploading === "original" ? "Đang tải…" : "Tải mô hình .glb (≤ 50MB)"} accept=".glb,model/gltf-binary" disabled={!!uploading} onFile={(f) => upload("original", f)} />
            <FilePick label="Ảnh poster (không bắt buộc)" accept="image/*" disabled={!!uploading} onFile={(f) => upload("poster", f)} />
          </>
        ) : null}
        {scene.kind === "photo" ? (
          <FilePick label={uploading ? "Đang tải…" : "Tải ảnh thực tế (≤ 20MB)"} accept="image/jpeg,image/webp,image/png" disabled={!!uploading} onFile={(f) => upload("display", f)} />
        ) : null}
        {scene.kind === "compare" ? (
          <>
            <FilePick label={`Ảnh TRƯỚC khi lắp${scene.draftMedia.display ? " ✓" : ""}`} accept="image/jpeg,image/webp,image/png" disabled={!!uploading} onFile={(f) => upload("display", f)} />
            <FilePick label={`Ảnh SAU khi lắp${scene.draftMedia.after ? " ✓" : ""}`} accept="image/jpeg,image/webp,image/png" disabled={!!uploading} onFile={(f) => upload("after", f)} />
          </>
        ) : null}
        {scene.kind === "video" ? (
          <>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Link YouTube / TikTok / Facebook / Drive" />
            <FilePick label={uploading === "original" ? "Đang tải…" : "Hoặc tải video MP4 (≤ 50MB)"} accept="video/mp4" disabled={!!uploading} onFile={(f) => upload("original", f)} />
            <FilePick label="Ảnh poster (không bắt buộc)" accept="image/*" disabled={!!uploading} onFile={(f) => upload("poster", f)} />
          </>
        ) : null}
        {scene.meta["width"] ? (
          <p className="text-xs text-muted-foreground">
            Ảnh gốc {String(scene.meta["width"])}×{String(scene.meta["height"])} · hiển thị {String(scene.meta["displayWidth"])}px
          </p>
        ) : null}
      </div>

      {(scene.kind === "photo" || scene.kind === "compare") && url(scene.draftMedia.display) ? (
        <img src={url(scene.draftMedia.display)} alt="" className="max-h-48 rounded-md" />
      ) : null}

      {canPreview ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => (hasWebGL() ? setPreview(!preview) : toast.error("Thiết bị không hỗ trợ WebGL."))}>
              {preview ? "Đóng xem trước" : "Xem trước & đặt điểm"}
            </Button>
            {preview ? (
              <Button size="sm" variant={placing ? "default" : "outline"} onClick={() => setPlacing(!placing)}>
                <MapPin className="size-3.5" /> {placing ? "Bấm lên ảnh để đặt điểm…" : "Thêm điểm"}
              </Button>
            ) : null}
          </div>
          {preview ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-card">
              {viewerError ? <p className="p-3 text-xs text-destructive">{viewerError}</p> : null}
              <Suspense fallback={<p className="p-3 text-xs">Đang mở…</p>}>
                {scene.kind === "panorama" ? (
                  <PanoramaViewer
                    scenes={panoData}
                    currentId={scene.id}
                    onSceneChange={() => {}}
                    onError={setViewerError}
                    {...(placing
                      ? { onPick: (c: { yaw: number; pitch: number }) => { setPano((h) => [...h, { id: newId(), label: "", yaw: c.yaw, pitch: c.pitch, kind: "info" }]); setPlacing(false); } }
                      : {})}
                  />
                ) : (
                  <ModelViewer
                    url={url(scene.draftMedia.original) ?? ""}
                    hotspots={modelHs}
                    led={{ materials: ledMaterials, colors: scene.led.colors, presets }}
                    onMaterials={(all, tags) => {
                      setAvailable(all);
                      setTagged(tags);
                    }}
                    onSavePreset={(p) => {
                      const name = window.prompt("Tên kịch bản LED (ví dụ: Tím chạy đuổi)", "")?.trim();
                      if (!name) return;
                      setPresets((l) => [...l, { ...p, id: newId(), name: name.slice(0, 40) }].slice(0, 12));
                      toast.success("Đã thêm kịch bản — bấm Lưu để áp dụng.");
                    }}
                    onError={setViewerError}
                    {...(placing
                      ? { onPick: (p: [number, number, number]) => { setModelHs((h) => [...h, { id: newId(), label: "", position: p }]); setPlacing(false); } }
                      : {})}
                  />
                )}
              </Suspense>
            </div>
          ) : null}
        </div>
      ) : null}

      {scene.kind === "panorama" && pano.length ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold">Điểm trên ảnh ({pano.length})</p>
          {pano.map((h) => (
            <div key={h.id} className="flex flex-wrap gap-1.5">
              <Input className="h-8 min-w-0 flex-1" placeholder="Nhãn, ví dụ: Dải LED cửa" value={h.label} onChange={(e) => setPano((l) => l.map((x) => (x.id === h.id ? { ...x, label: e.target.value } : x)))} />
              <select
                className="h-8 rounded-md border border-input bg-background px-1 text-xs"
                value={h.targetSceneId ?? ""}
                aria-label="Khi bấm"
                onChange={(e) => setPano((l) => l.map((x) => (x.id === h.id ? { ...x, targetSceneId: e.target.value || null, kind: e.target.value ? "link" : "info" } : x)))}
              >
                <option value="">Hiện nhãn</option>
                {otherPanos.map((o) => (
                  <option key={o.id} value={o.id}>→ {o.title || "Góc khác"}</option>
                ))}
              </select>
              <Button size="icon" variant="ghost" className="size-8" aria-label="Xóa điểm" onClick={() => setPano((l) => l.filter((x) => x.id !== h.id))}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {scene.kind === "model" && modelHs.length ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold">Điểm trên mô hình ({modelHs.length})</p>
          {modelHs.map((h) => (
            <div key={h.id} className="flex gap-1.5">
              <Input className="h-8" placeholder="Nhãn" value={h.label} onChange={(e) => setModelHs((l) => l.map((x) => (x.id === h.id ? { ...x, label: e.target.value } : x)))} />
              <Button size="icon" variant="ghost" className="size-8" aria-label="Xóa điểm" onClick={() => setModelHs((l) => l.filter((x) => x.id !== h.id))}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {scene.kind === "model" ? (
        <div className="space-y-1.5 rounded-md border border-border p-2">
          <p className="text-xs font-semibold">Vùng LED đổi màu (chỉ khi file 3D có material riêng cho LED)</p>
          {available.length ? (
            <div className="flex flex-wrap gap-1.5">
              {available.map((m) => (
                <label key={m} className="flex items-center gap-1 rounded border border-border px-1.5 py-0.5 text-xs">
                  <input type="checkbox" checked={ledMaterials.includes(m)} onChange={(e) => setLedMaterials((l) => (e.target.checked ? [...l, m] : l.filter((x) => x !== m)))} />
                  {m}
                  {tagged.includes(m) ? <span className="text-primary">• gắn tag LED</span> : null}
                </label>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Mở "Xem trước" để đọc danh sách material trong file. Không chọn gì = khách không thấy bảng đổi màu.
              {ledMaterials.length ? ` Đang chọn: ${ledMaterials.join(", ")}` : ""}
            </p>
          )}
        </div>
      ) : null}

      {scene.kind === "model" && presets.length ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold">Kịch bản LED ({presets.length})</p>
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <span className="size-3 rounded-full" style={{ background: p.color }} />
              <span className="flex-1">{p.name} · {LED_EFFECT_LABEL[p.effect]}</span>
              <Button size="icon" variant="ghost" className="size-7" aria-label="Xóa kịch bản" onClick={() => setPresets((l) => l.filter((x) => x.id !== p.id))}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {scene.kind === "panorama" ? (
        <label className="block space-y-1 text-xs">
          <span className="font-semibold">Màu LED đang bật trong ảnh thật này</span>
          <select value={ledTag} onChange={(e) => setLedTag(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Không ghi</option>
            {PANO_LED_TAGS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          <span className="text-muted-foreground">Chụp cùng vị trí với nhiều màu LED khác nhau → khách bấm chọn màu để xem ảnh thật tương ứng.</span>
        </label>
      ) : null}

      <Button className="w-full" disabled={saving} onClick={save}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : null} Lưu thông tin & điểm
      </Button>
      {scene.status === "published" ? (
        <p className="text-[11px] text-muted-foreground">
          Tiêu đề, điểm và vùng LED áp dụng ngay cho khách. Tệp mới tải lên chỉ hiện với khách sau khi bấm "Xuất bản" lại.
        </p>
      ) : null}
    </div>
  );
}

function CaptureGuide() {
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
        Ảnh chụp bằng chế độ <b>Toàn cảnh / Pano</b> của iPhone hoặc Android <b>KHÔNG dùng được</b>: đó chỉ là ảnh dải ngang,
        thiếu trần và sàn. Hệ thống sẽ từ chối ảnh không đúng tỉ lệ 2:1.
      </div>
      <ol className="list-decimal space-y-2 pl-5">
        <li><b>Chuẩn bị:</b> xe đỗ nơi ánh sáng đều; bật LED nội thất đúng màu cần giới thiệu; đóng cửa, dọn đồ trong xe.</li>
        <li><b>Ứng dụng chụp ảnh cầu:</b> dùng app chụp 360° nhiều hàng (ví dụ Teleport, Panorama 360, PanoraMax hoặc chế độ Photo Sphere nếu máy có). App sẽ hướng dẫn chụp nhiều vòng: ngang tầm mắt, chếch lên trần, chếch xuống sàn.</li>
        <li><b>Vị trí:</b> đặt điện thoại ở giữa khoang (giữa 2 ghế trước, ngang tầm tựa đầu). Xoay quanh chính ống kính, không xoay quanh người. Dùng chân máy mini/gậy nếu có.</li>
        <li><b>Mỗi góc cabin là một ảnh</b>: ví dụ "Ghế lái", "Hàng ghế sau", "Cốp". Sau đó dùng "Thêm điểm" để nối các góc với nhau.</li>
        <li><b>Ghép ảnh (stitching):</b> để app tự ghép, hoặc ghép bằng phần mềm ngoài (PTGui, Hugin). Sửa đường nối lỗi trước khi xuất.</li>
        <li><b>Xuất file:</b> JPEG hoặc WebP, <b>tỉ lệ đúng 2:1</b> (ví dụ 8192×4096 hoặc 6000×3000), tối thiểu 4096×2048, dưới 50MB.</li>
        <li><b>Tải lên:</b> Thêm mới → Ảnh 360° → Tạo bản nháp → tải ảnh. Hệ thống tự tạo bản nhẹ để xem nhanh. Kiểm tra bằng "Xem trước" rồi bấm "Xuất bản".</li>
      </ol>
      <p className="text-xs text-muted-foreground">
        Mô hình 3D: chỉ dùng file .glb do đơn vị dựng hình cung cấp. Muốn khách đổi màu LED, file phải có material riêng cho dải LED (đặt tên rõ ràng, ví dụ LED_Door).
      </p>
    </div>
  );
}
