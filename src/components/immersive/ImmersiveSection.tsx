/**
 * SKLIGHT Immersive Viewer — khối nhẹ đặt cuối trang đời xe/danh mục.
 * - Chỉ truy vấn khi khối sắp lọt vào màn hình.
 * - Trình xem 360°/3D chỉ nạp khi người xem bấm kích hoạt.
 * - Không có media đã xuất bản → ẩn hoàn toàn với khách; admin thấy nút quản lý.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Expand, Images, Minimize, Orbit, Play, Settings2, SplitSquareHorizontal } from "lucide-react";
import { useAdmin } from "@/hooks/useAdmin";
import {
  PUBLIC_BUCKET,
  immersiveKey,
  listScenes,
  mediaPaths,
  signPaths,
  type ImmersiveScene,
  type ImmersiveScope,
} from "@/data/immersive.api";
import { sceneHasMedia, LIMITS, PANO_LED_TAGS, pickSceneForTag, mapSceneForNavigation } from "@/lib/immersive";
import { hasWebGL } from "@/lib/webgl";
import { LazyEmbed } from "@/components/LazyEmbed";
import { isVerticalUrl, toEmbedUrl } from "@/lib/video";
import { CompareSlider } from "./CompareSlider";

const PanoramaViewer = lazy(() => import("./PanoramaViewer"));
const ModelViewer = lazy(() => import("./ModelViewer"));
const ImmersiveManager = lazy(() => import("./ImmersiveManager"));

type Tab = "panorama" | "model" | "media" | "compare";

export { hasWebGL };

export function ImmersiveSection({
  scope,
  targetName,
  products,
}: {
  scope: ImmersiveScope;
  targetName: string;
  products: { dbId: string; name: string }[];
}) {
  const { canManage } = useAdmin();
  const sentinel = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) return setNear(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const scenesQ = useQuery({
    queryKey: immersiveKey(scope),
    queryFn: () => listScenes(scope),
    enabled: near,
    staleTime: 60_000,
  });

  const published = useMemo(
    () =>
      (scenesQ.data ?? []).filter(
        (s) => s.status === "published" && sceneHasMedia(s.kind, s.publishedMedia, s.videoUrl),
      ),
    [scenesQ.data],
  );

  const urlsQ = useQuery({
    queryKey: ["immersive-urls", published.map((s) => mediaPaths(s.publishedMedia).join(",")).join("|")],
    queryFn: () => signPaths(PUBLIC_BUCKET, published.flatMap((s) => mediaPaths(s.publishedMedia))),
    enabled: published.length > 0,
    staleTime: 5 * 3600_000,
  });

  const productName = (id: string | null) => products.find((p) => p.dbId === id)?.name ?? null;

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-px" />
      {published.length > 0 && urlsQ.data ? (
        <ImmersiveStage scenes={published} urls={urlsQ.data} productName={productName} />
      ) : null}
      {canManage ? (
        <div className="px-3 pb-4">
          <button
            type="button"
            onClick={() => setManagerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 px-3 py-3 text-sm font-medium text-primary"
          >
            <Settings2 className="size-4" />
            Quản lý 360° / 3D / ảnh thực tế
            {scenesQ.data ? ` (${published.length} đã xuất bản / ${scenesQ.data.length})` : ""}
          </button>
          {managerOpen ? (
            <Suspense fallback={null}>
              <ImmersiveManager
                open={managerOpen}
                onOpenChange={setManagerOpen}
                scope={scope}
                targetName={targetName}
                products={products}
              />
            </Suspense>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function ImmersiveStage({
  scenes,
  urls,
  productName,
}: {
  scenes: ImmersiveScene[];
  urls: Record<string, string>;
  productName: (id: string | null) => string | null;
}) {
  const pano = scenes.filter((s) => s.kind === "panorama");
  const models = scenes.filter((s) => s.kind === "model");
  const media = scenes.filter((s) => s.kind === "photo" || s.kind === "video");
  const compare = scenes.filter((s) => s.kind === "compare");
  const url = useCallback((p?: string) => (p ? urls[p] : undefined), [urls]);

  return (
    <section className="space-y-3 px-3 pb-6" aria-labelledby="sk-immersive-title">
      <div>
        <p className="text-[11px] tracking-[0.2em] text-primary uppercase">SKLIGHT Immersive</p>
        <h2 id="sk-immersive-title" className="sk-gradient-text text-lg font-bold">
          Trải nghiệm thực tế trên xe
        </h2>
      </div>
      {pano.length ? (<div className="space-y-2"><h3 className="flex items-center gap-1.5 text-sm font-semibold"><Orbit className="size-4 text-primary" />360°</h3><PanoramaTab scenes={pano} url={url} productName={productName} /></div>) : null}
      {models.length ? (<div className="space-y-2"><h3 className="flex items-center gap-1.5 text-sm font-semibold"><Box className="size-4 text-primary" />3D</h3><ModelTab scenes={models} url={url} productName={productName} /></div>) : null}
      {media.length ? (
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Images className="size-4 text-primary" />Ảnh & video</h3>
          {media.map((s) => (
            <figure key={s.id} className="sk-edge overflow-hidden rounded-lg bg-card">
              {s.kind === "photo" ? (
                <img
                  src={url(s.publishedMedia.display ?? s.publishedMedia.original)}
                  alt={s.title || "Ảnh lắp đặt thực tế"}
                  loading="lazy"
                  decoding="async"
                  className="block h-auto w-full"
                />
              ) : s.publishedMedia.original ? (
                <video
                  controls
                  playsInline
                  preload="none"
                  poster={url(s.publishedMedia.poster)}
                  src={url(s.publishedMedia.original)}
                  className="block aspect-video w-full bg-black"
                />
              ) : toEmbedUrl(s.videoUrl) ? (
                <LazyEmbed src={toEmbedUrl(s.videoUrl) ?? ""} title={s.title || "Video"} vertical={isVerticalUrl(s.videoUrl)} />
              ) : null}
              <Caption scene={s} productName={productName} />
            </figure>
          ))}
        </div>
      ) : null}
      {false && compare.length ? (
        <div className="space-y-3">
          {compare.map((s) => (
            <figure key={s.id} className="sk-edge overflow-hidden rounded-lg bg-card">
              <CompareSlider
                before={url(s.publishedMedia.display ?? s.publishedMedia.original) ?? ""}
                after={url(s.publishedMedia.after) ?? ""}
                label={s.title}
              />
              <Caption scene={s} productName={productName} />
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Caption({ scene, productName }: { scene: ImmersiveScene; productName: (id: string | null) => string | null }) {
  const product = productName(scene.productId);
  if (!scene.title && !scene.caption && !product) return null;
  return (
    <figcaption className="px-3 py-2">
      {scene.title ? <p className="text-sm font-semibold">{scene.title}</p> : null}
      {product ? <p className="text-xs text-primary">{product}</p> : null}
      {scene.caption ? <p className="text-xs text-muted-foreground">{scene.caption}</p> : null}
    </figcaption>
  );
}

/** Khung sân khấu chung: poster → bấm kích hoạt → trình xem; toàn màn hình; lỗi. */
export function ViewerFrame({
  poster,
  label,
  activateLabel,
  children,
}: {
  poster?: string | undefined;
  label: string;
  activateLabel: string;
  children: (onError: (m: string) => void) => React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const onChange = () => !document.fullscreenElement && setFull(false);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    if (!full) return;
    document.documentElement.classList.add("sk-viewer-full");
    return () => document.documentElement.classList.remove("sk-viewer-full");
  }, [full]);
  useEffect(() => {
    if (!full) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [full]);

  const toggleFull = async () => {
    const el = frameRef.current;
    if (!el) return;
    if (full) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      setFull(false);
      return;
    }
    setFull(true);
    // iPhone không hỗ trợ toàn màn hình phần tử → dùng khung phủ kín màn hình.
    if (el.requestFullscreen) await el.requestFullscreen().catch(() => {});
  };

  const activate = () => {
    if (!hasWebGL()) {
      setError("Trình duyệt/thiết bị này không hỗ trợ WebGL nên chưa xem được. Hãy thử Chrome hoặc Safari mới nhất.");
      return;
    }
    setError(null);
    setActive(true);
  };

  return (
    <div
      ref={frameRef}
      className={
        full
          ? "fixed inset-0 z-[80] bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          : "sk-edge relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-card sm:aspect-video"
      }
    >
      {poster ? (
        <img src={poster} alt="" aria-hidden loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-70" />
      ) : null}
      {active && !error ? (
        <Suspense fallback={<p className="absolute inset-0 grid place-items-center text-xs text-muted-foreground">Đang mở trình xem…</p>}>
          {children((m) => setError(m))}
        </Suspense>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-background/80 to-transparent p-4">
          <div className="text-center">
            <button
              type="button"
              onClick={activate}
              className="sk-shimmer lux-cta inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
            >
              <Play className="size-4" />
              {activateLabel}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">{label}</p>
            {error ? <p role="alert" className="mt-2 text-xs text-destructive">{error}</p> : null}
          </div>
        </div>
      )}
      {active && error ? (
        <div role="alert" className="absolute inset-x-3 top-3 rounded-md bg-background/90 p-2 text-center text-xs text-destructive">
          {error}{" "}
          <button type="button" className="underline" onClick={() => { setError(null); setActive(false); }}>
            Thử lại
          </button>
        </div>
      ) : null}
      {active ? (
        <button
          type="button"
          onClick={toggleFull}
          aria-label={full ? "Thoát toàn màn hình" : "Xem toàn màn hình"}
          className="absolute top-2 right-2 z-10 grid size-9 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur"
        >
          {full ? <Minimize className="size-4" /> : <Expand className="size-4" />}
        </button>
      ) : null}
    </div>
  );
}

function PanoramaTab({
  scenes,
  url,
  productName,
}: {
  scenes: ImmersiveScene[];
  url: (p?: string) => string | undefined;
  productName: (id: string | null) => string | null;
}) {
  const [current, setCurrent] = useState(scenes[0]!.id);
  const data = useMemo(
    () =>
      scenes.map((s) => ({
        id: s.id,
        title: s.title,
        url: url(s.publishedMedia.display ?? s.publishedMedia.original) ?? "",
        width: Number(s.meta["displayWidth"]) || LIMITS.panoramaDisplayWidth,
        hotspots: s.panoHotspots.filter((h) => !h.targetSceneId || scenes.some((x) => x.id === h.targetSceneId)),
        previewUrl: url(s.publishedMedia.poster),
        previewWidth: Math.min(LIMITS.posterWidth, Number(s.meta["width"]) || LIMITS.posterWidth),
        hdUrl: Number(s.meta["bytes"]) <= 20 * 1024 * 1024 ? url(s.publishedMedia.original) : undefined,
        hdWidth: Number(s.meta["width"]) || undefined,
      })),
    [scenes, url],
  );
  const scene = scenes.find((s) => s.id === current) ?? scenes[0]!;
  const tagOf = (s: ImmersiveScene) => (typeof s.meta["ledTag"] === "string" ? (s.meta["ledTag"] as string) : "");
  const tagged = useMemo(() => scenes.map((s) => ({ id: s.id, title: s.title, tag: tagOf(s) })), [scenes]);
  const curTagged = tagged.find((t) => t.id === scene.id)!;
  const tags = PANO_LED_TAGS.filter((t) => tagged.some((s) => s.tag === t.id));
  const currentRef = useRef(current);
  currentRef.current = current;
  // Hotspot chuyển cảnh: giữ màu LED nếu góc đích có ảnh thật cùng màu.
  const onSceneChange = useCallback(
    (id: string) => setCurrent(mapSceneForNavigation(tagged, currentRef.current, id)),
    [tagged],
  );
  return (
    <div className="space-y-2">
      {tags.length ? (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Màu LED trong ảnh thật">
          <span className="text-[11px] text-muted-foreground">Ảnh thật với LED:</span>
          {tags.map((t) => {
            const target = pickSceneForTag(tagged, curTagged, t.id);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={curTagged.tag === t.id}
                disabled={!target}
                title={target ? undefined : "Chưa có ảnh góc này"}
                onClick={() => target && setCurrent(target)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] disabled:opacity-40 ${curTagged.tag === t.id ? "border-primary text-primary" : "border-border"}`}
              >
                <span className="size-2.5 rounded-full" style={{ background: t.color }} />
                {t.label}
                {target ? null : <span className="text-[10px] text-muted-foreground">· Chưa có ảnh góc này</span>}
              </button>
            );
          })}
        </div>
      ) : null}
      <ViewerFrame
        poster={url(scenes[0]!.publishedMedia.poster)}
        label="Kéo, vuốt hoặc chụm để xoay và phóng to"
        activateLabel="Xem cabin 360°"
      >
        {(onError) => (
          <PanoramaViewer scenes={data} currentId={current} onSceneChange={onSceneChange} onError={onError} />
        )}
      </ViewerFrame>
      {scenes.length > 1 ? (
        <div className="flex gap-1.5 overflow-x-auto" aria-label="Chọn góc nhìn">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === current}
              onClick={() => setCurrent(s.id)}
              className={`shrink-0 rounded-md border px-2.5 py-1 text-xs ${
                s.id === current ? "border-primary text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {s.title || `Góc ${i + 1}`}
            </button>
          ))}
        </div>
      ) : null}
      <Caption scene={scene} productName={productName} />
    </div>
  );
}

function ModelTab({
  scenes,
  url,
  productName,
}: {
  scenes: ImmersiveScene[];
  url: (p?: string) => string | undefined;
  productName: (id: string | null) => string | null;
}) {
  const [current, setCurrent] = useState(scenes[0]!.id);
  const scene = scenes.find((s) => s.id === current) ?? scenes[0]!;
  return (
    <div className="space-y-2">
      <ViewerFrame
        key={scene.id}
        poster={url(scene.publishedMedia.poster)}
        label="Kéo để xoay, chụm để phóng to"
        activateLabel="Xem mô hình 3D"
      >
        {(onError) => (
          <ModelViewer
            url={url(scene.publishedMedia.original) ?? ""}
            hotspots={scene.modelHotspots}
            led={scene.led}
            onError={onError}
          />
        )}
      </ViewerFrame>
      {scenes.length > 1 ? (
        <div className="flex gap-1.5 overflow-x-auto">
          {scenes.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={s.id === current}
              onClick={() => setCurrent(s.id)}
              className={`shrink-0 rounded-md border px-2.5 py-1 text-xs ${
                s.id === current ? "border-primary text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {s.title || `Mô hình ${i + 1}`}
            </button>
          ))}
        </div>
      ) : null}
      <Caption scene={scene} productName={productName} />
    </div>
  );
}
