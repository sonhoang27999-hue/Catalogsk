/**
 * Trình xem ảnh cầu 360° (Marzipano). Chỉ được nạp động sau khi người xem bấm kích hoạt.
 * Hỗ trợ kéo/chạm/pinch/lăn chuột, phím mũi tên, +/-, hotspot chuyển góc cabin.
 */
import { useEffect, useRef, useState } from "react";
import type { PanoHotspot } from "@/lib/immersive";
import { planSceneRetention } from "@/lib/immersive";
import { maxTextureSize } from "@/lib/webgl";

export type PanoScene = {
  id: string;
  title: string;
  url: string;
  width: number;
  hotspots: PanoHotspot[];
  /** Ảnh nhỏ 2:1 tải trước (đa độ phân giải). */
  previewUrl?: string | undefined;
  previewWidth?: number | undefined;
  /** Ảnh gốc HD chỉ dùng trên máy đủ mạnh. */
  hdUrl?: string | undefined;
  hdWidth?: number | undefined;
};


/** Danh sách mức ảnh tăng dần: preview → hiển thị → (HD nếu máy đủ mạnh). */
export function panoLevels(s: PanoScene, opts: { maxTex: number; coarse: boolean; saveData: boolean }) {
  const levels: { url: string; width: number }[] = [];
  if (s.previewUrl && s.previewWidth && s.previewWidth < s.width) levels.push({ url: s.previewUrl, width: s.previewWidth });
  levels.push({ url: s.url, width: Math.min(s.width, opts.maxTex) });
  if (s.hdUrl && s.hdWidth && s.hdWidth > s.width && s.hdWidth <= opts.maxTex && !opts.coarse && !opts.saveData)
    levels.push({ url: s.hdUrl, width: s.hdWidth });
  return levels;
}

type Props = {
  scenes: PanoScene[];
  currentId: string;
  onSceneChange: (id: string) => void;
  /** Chế độ quản trị: bấm vào ảnh để lấy toạ độ đặt hotspot. */
  onPick?: (coords: { yaw: number; pitch: number }) => void;
  onError?: (message: string) => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function PanoramaViewer({ scenes, currentId, onSceneChange, onPick, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const libRef = useRef<any>(null);
  const cacheRef = useRef(new Map<string, any>());
  const recentRef = useRef<string[]>([]);
  const [ready, setReady] = useState(false);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const changeRef = useRef(onSceneChange);
  changeRef.current = onSceneChange;

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) return;
    void import("marzipano")
      .then((mod) => {
        if (disposed) return;
        const Marzipano = (mod as any).default ?? mod;
        libRef.current = Marzipano;
        const viewer = new Marzipano.Viewer(host, {
          controls: { mouseViewMode: "drag" },
          stage: { progressive: true },
        });
        const controls = viewer.controls();
        const K = Marzipano.KeyControlMethod;
        controls.registerMethod("kLeft", new K(37, "yaw", -0.8, 3, host), true);
        controls.registerMethod("kRight", new K(39, "yaw", 0.8, 3, host), true);
        controls.registerMethod("kUp", new K(38, "pitch", -0.8, 3, host), true);
        controls.registerMethod("kDown", new K(40, "pitch", 0.8, 3, host), true);
        controls.registerMethod("kIn", new K(187, "zoom", -0.8, 3, host), true);
        controls.registerMethod("kOut", new K(189, "zoom", 0.8, 3, host), true);
        viewerRef.current = viewer;
        setReady(true);
      })
      .catch(() => onError?.("Không tải được trình xem 360°."));
    const cache = cacheRef.current;
    return () => {
      disposed = true;
      cache.clear();
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dựng lại cảnh khi danh sách ảnh/hotspot đổi.
  useEffect(() => {
    if (!ready) return;
    const viewer = viewerRef.current;
    const cache = cacheRef.current;
    return () => {
      // Hủy cảnh cũ để giải phóng bộ nhớ ảnh lớn.
      cache.forEach((sc) => {
        try {
          viewer?.destroyScene(sc);
        } catch {
          /* đã bị hủy */
        }
      });
      cache.clear();
      recentRef.current = [];
    };
  }, [ready, scenes]);

  useEffect(() => {
    const viewer = viewerRef.current;
    const Marzipano = libRef.current;
    if (!ready || !viewer || !Marzipano) return;
    const data = scenes.find((s) => s.id === currentId) ?? scenes[0];
    if (!data) return;
    let scene = cacheRef.current.get(data.id);
    if (!scene) {
      const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const levels = panoLevels(data, {
        maxTex: maxTextureSize(),
        coarse: window.matchMedia("(pointer: coarse)").matches,
        saveData: Boolean(conn?.saveData),
      });
      const source = new Marzipano.ImageUrlSource((tile: { z: number }) => ({ url: levels[tile.z]?.url ?? data.url }));
      const geometry = new Marzipano.EquirectGeometry(levels.map((l) => ({ width: l.width })));
      const top = levels[levels.length - 1]!.width;
      const limiter = Marzipano.RectilinearView.limit.traditional(top, (110 * Math.PI) / 180);
      const view = new Marzipano.RectilinearView({ yaw: 0, pitch: 0, fov: (95 * Math.PI) / 180 }, limiter);
      scene = viewer.createScene({ source, geometry, view, pinFirstLevel: true });
      for (const h of data.hotspots) {
        const el = document.createElement("button");
        el.type = "button";
        el.className = h.targetSceneId ? "sk-pano-hotspot sk-pano-hotspot--link" : "sk-pano-hotspot";
        el.setAttribute("aria-label", h.label || (h.targetSceneId ? "Chuyển góc nhìn" : "Điểm thông tin"));
        const dot = document.createElement("span");
        dot.className = "sk-pano-hotspot__dot";
        el.appendChild(dot);
        if (h.label) {
          const tag = document.createElement("span");
          tag.className = "sk-pano-hotspot__label";
          tag.textContent = h.label;
          el.appendChild(tag);
        }
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          if (h.targetSceneId) changeRef.current(h.targetSceneId);
          else el.classList.toggle("is-open");
        });
        scene.hotspotContainer().createHotspot(el, { yaw: h.yaw, pitch: h.pitch });
      }
      cacheRef.current.set(data.id, scene);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scene.switchTo({ transitionDuration: reduce ? 0 : 600 });
    // Chỉ giữ cảnh hiện tại + 1 cảnh liền trước; hủy phần còn lại để giải phóng texture.
    const plan = planSceneRetention(recentRef.current, data.id);
    recentRef.current = plan.keep;
    for (const id of plan.drop) {
      const old = cacheRef.current.get(id);
      cacheRef.current.delete(id);
      if (!old) continue;
      try {
        viewer.destroyScene(old);
      } catch {
        /* đã bị hủy */
      }
    }
  }, [ready, scenes, currentId]);

  // Quản trị: bấm (không kéo) để lấy toạ độ.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !onPick) return;
    let start: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => (start = { x: e.clientX, y: e.clientY });
    const up = (e: PointerEvent) => {
      if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
      const view = viewerRef.current?.view();
      if (!view) return;
      const r = host.getBoundingClientRect();
      const c = view.screenToCoordinates({ x: e.clientX - r.left, y: e.clientY - r.top });
      if (c) pickRef.current?.({ yaw: c.yaw, pitch: c.pitch });
    };
    host.addEventListener("pointerdown", down);
    host.addEventListener("pointerup", up);
    return () => {
      host.removeEventListener("pointerdown", down);
      host.removeEventListener("pointerup", up);
    };
  }, [onPick]);

  // Xoay theo cảm biến nghiêng của điện thoại (bật bằng nút, iOS cần cho phép).
  const [gyroOk, setGyroOk] = useState(false);
  const [gyroOn, setGyroOn] = useState(false);
  useEffect(() => {
    setGyroOk(!onPick && typeof window !== "undefined" && "DeviceOrientationEvent" in window && window.matchMedia("(pointer: coarse)").matches);
  }, [onPick]);
  useEffect(() => {
    if (!gyroOn) return;
    let prev: { a: number; b: number; g: number } | null = null;
    const wrap = (d: number) => ((d + 540) % 360) - 180;
    const onOri = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null || e.gamma == null) return;
      const cur = { a: e.alpha, b: e.beta, g: e.gamma };
      const view = viewerRef.current?.view();
      if (prev && view) {
        const angle = (screen.orientation?.angle ?? 0) % 360;
        const dA = wrap(cur.a - prev.a);
        const dTilt = angle === 90 ? -(cur.g - prev.g) : angle === 270 ? cur.g - prev.g : cur.b - prev.b;
        const rad = Math.PI / 180;
        if (Math.abs(dA) < 30 && Math.abs(dTilt) < 30) {
          view.setYaw(view.yaw() + dA * rad);
          view.setPitch(view.pitch() - dTilt * rad);
        }
      }
      prev = cur;
    };
    window.addEventListener("deviceorientation", onOri);
    return () => window.removeEventListener("deviceorientation", onOri);
  }, [gyroOn]);
  const toggleGyro = async () => {
    if (gyroOn) return setGyroOn(false);
    const D = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    try {
      if (typeof D.requestPermission === "function" && (await D.requestPermission()) !== "granted") {
        onError?.("Chưa được phép dùng cảm biến nghiêng. Anh/chị có thể kéo để xoay.");
        return;
      }
      setGyroOn(true);
    } catch {
      onError?.("Máy không hỗ trợ xoay theo cảm biến. Vui lòng kéo để xoay.");
    }
  };

  return (
    <>
    <div
      ref={hostRef}
      tabIndex={0}
      role="application"
      aria-label="Ảnh 360°: kéo hoặc dùng phím mũi tên để xoay, phím + và - để phóng to"
      className={`absolute inset-0 touch-none outline-none focus-visible:ring-2 focus-visible:ring-primary ${onPick ? "cursor-crosshair" : "cursor-grab"}`}
    />
    {gyroOk ? (
      <button
        type="button"
        onClick={toggleGyro}
        aria-pressed={gyroOn}
        className={`absolute bottom-3 left-3 z-10 rounded-full border px-3 py-1.5 text-xs font-semibold backdrop-blur ${gyroOn ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/70 text-foreground"}`}
      >
        {gyroOn ? "Tắt xoay theo máy" : "Xoay theo điện thoại"}
      </button>
    ) : null}
    </>
  );
}
