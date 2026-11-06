/**
 * TRANG DEMO CÔ LẬP — SKLIGHT Immersive Viewer V1–V3.
 * Chỉ dùng fixtures + file tĩnh trong /public/demo/immersive, KHÔNG đọc/ghi database.
 * Chỉ bật trên localhost và hostname Preview của Lovable (isPreviewHost); tắt trên domain production
 * hoặc khi VITE_IMMERSIVE_DEMO="off". Build Vercel/off còn xóa thư mục demo khỏi bản build (vite.config.ts).
 * Xóa demo: xóa file này và thư mục public/demo/immersive.
 */
import { createFileRoute, Link, useHydrated } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { ViewerFrame } from "@/components/immersive/ImmersiveSection";
import { CompareSlider } from "@/components/immersive/CompareSlider";
import type { PanoScene } from "@/components/immersive/PanoramaViewer";
import type { LedPreset, ModelHotspot } from "@/lib/immersive";

const PanoramaViewer = lazy(() => import("@/components/immersive/PanoramaViewer"));
const ModelViewer = lazy(() => import("@/components/immersive/ModelViewer"));

const BASE = "/demo/immersive/";
const DEMO_OFF = import.meta.env["VITE_IMMERSIVE_DEMO"] === "off";

/** Chỉ bật trên máy dev và hostname Preview của Lovable; domain production luôn tắt. */
export function isPreviewHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return true;
  if (/\.(lovableproject|lovableproject-dev)\.com$/.test(h)) return true;
  if (/^project--[0-9a-f-]{36}-dev\.lovable\.app$/.test(h)) return true;
  const m = h.match(/^([^.]+)\.(?:([a-z0-9-]+)\.)?(lovable\.app|gpt-eng\.com|gptengineer\.run)$/);
  if (!m) return false;
  const first = m[1]!;
  if (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(first)) return true;
  return !!m[2] && /^live--[0-9a-f-]{36}(?:-thr_[a-z0-9]+)?$/.test(first);
}

const SCENES: PanoScene[] = [
  {
    id: "demo-cabin",
    title: "DEMO – Cabin SUV (mô phỏng 3D)",
    url: BASE + "demo-suv-cabin-360.jpg",
    width: 4096,
    previewUrl: BASE + "demo-suv-cabin-360-preview.jpg",
    previewWidth: 1024,
    hotspots: [
      { id: "h1", label: "LED taplo", yaw: 0, pitch: 0.05, kind: "led" },
      { id: "h2", label: "LED cửa trái", yaw: -1.4, pitch: 0.08, kind: "led" },
      { id: "h3", label: "LED cửa phải", yaw: 1.4, pitch: 0.08, kind: "led" },
      { id: "h4", label: "Trần sao", yaw: 0, pitch: 1.2, kind: "info" },
    ],
  },
];

const LED: LedPreset = {
  materials: ["LED_Dash", "LED_Door_L", "LED_Door_R", "LED_Footwell", "LED_Roof"],
  colors: ["#bf5af2", "#0a84ff", "#ff375f", "#30d158", "#ffd60a", "#ffffff"],
  presets: [
    { id: "p1", name: "Purple tĩnh", effect: "static", color: "#bf5af2", brightness: 1.5, zoneColors: {} },
    { id: "p2", name: "Chạy đuổi tím", effect: "chase", color: "#bf5af2", brightness: 2, zoneColors: {} },
    { id: "p3", name: "Cầu vồng", effect: "rainbow", color: "#bf5af2", brightness: 1.5, zoneColors: {} },
  ],
};

const MODEL_HOTSPOTS: ModelHotspot[] = [
  { id: "m1", label: "LED taplo", position: [0, 0.15, 1.29] },
  { id: "m2", label: "LED cửa trái", position: [-0.77, 0.1, 0.2] },
  { id: "m3", label: "Trần LED", position: [0, 0.58, 0.1] },
];

const FILES = [
  ["demo-suv-cabin-360.jpg", "Ảnh 360° 4096×2048 (2:1, mô phỏng 3D)"],
  ["demo-suv-cabin-360-preview.jpg", "Ảnh 360° xem trước 1024×512"],
  ["demo-suv-poster.jpg", "Poster"],
  ["demo-suv-before.jpg", "Ảnh TRƯỚC (cùng góc)"],
  ["demo-suv-after.jpg", "Ảnh SAU – LED tím (cùng góc)"],
  ["demo-suv-cabin-led.glb", "Mô hình cabin GLB có 5 vùng LED_…"],
  ["generate_demo_assets.py", "Mã tạo lại toàn bộ file mẫu"],
];

export const Route = createFileRoute("/demo/immersive")({
  head: () => ({
    meta: [
      { title: "DEMO – SKLIGHT Immersive Viewer (dữ liệu thử nghiệm)" },
      { name: "description", content: "Trang kiểm thử nội bộ 360°, so sánh và LED 3D bằng dữ liệu mô phỏng." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "DEMO – SKLIGHT Immersive Viewer" },
      { property: "og:description", content: "Trang kiểm thử nội bộ bằng dữ liệu mô phỏng." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DemoPage,
});

function DemoPage() {
  const [scene, setScene] = useState(SCENES[0]!.id);
  const hydrated = useHydrated();
  if (!hydrated) return <div className="p-6 text-center text-muted-foreground">Đang tải demo…</div>;
  if (DEMO_OFF || !isPreviewHost(window.location.hostname))
    return (
      <div className="p-6 text-center text-muted-foreground">
        Trang demo đang tắt. <Link to="/" className="underline">Về trang chủ</Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-[480px] space-y-6 p-4 pb-24">
      <div className="rounded-lg border-2 border-primary bg-card p-3 text-center">
        <p className="text-lg font-bold text-primary">DEMO / DỮ LIỆU THỬ NGHIỆM</p>
        <p className="text-xs text-muted-foreground">
          SUV DEMO giả định. Toàn bộ ảnh và mô hình là mô phỏng 3D, không phải xe thật, không lưu vào dữ liệu catalog.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">1. Ảnh 360° + hotspot + toàn màn hình</h2>
        <ViewerFrame poster={BASE + "demo-suv-poster.jpg"} label="DEMO 360°" activateLabel="Mở xem 360°">
          {(onError) => (
            <Suspense fallback={null}>
              <PanoramaViewer scenes={SCENES} currentId={scene} onSceneChange={setScene} onError={onError} />
            </Suspense>
          )}
        </ViewerFrame>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">2. So sánh trước / sau</h2>
        <CompareSlider before={BASE + "demo-suv-before.jpg"} after={BASE + "demo-suv-after.jpg"} label="DEMO – kéo để so sánh" />
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">3. Mô hình 3D + LED (tím, chạy đuổi, theo vùng)</h2>
        <ViewerFrame poster={BASE + "demo-suv-poster.jpg"} label="DEMO 3D" activateLabel="Mở mô hình 3D">
          {(onError) => (
            <Suspense fallback={null}>
              <ModelViewer url={BASE + "demo-suv-cabin-led.glb"} hotspots={MODEL_HOTSPOTS} led={LED} onError={onError} />
            </Suspense>
          )}
        </ViewerFrame>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Tải file mẫu</h2>
        <ul className="space-y-1 text-sm">
          {FILES.map(([f, d]) => (
            <li key={f}>
              <a href={BASE + f} download className="text-primary underline">{f}</a>
              <span className="text-muted-foreground"> — {d}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
