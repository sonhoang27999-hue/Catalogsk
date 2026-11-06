/**
 * Trình xem mô hình 3D GLB (three.js, nạp động). Xoay/phóng to bằng chạm hoặc chuột.
 * Đổi màu LED CHỈ hiện khi file GLB có đúng material đã cấu hình.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  LED_EFFECT_LABEL,
  isTaggedLed,
  ledFrame,
  matchLedMaterials,
  type LedEffect,
  type LedPreset,
  type LedScenePreset,
  type ModelHotspot,
} from "@/lib/immersive";

type Props = {
  url: string;
  hotspots: ModelHotspot[];
  led: LedPreset;
  onPick?: (position: [number, number, number]) => void;
  onMaterials?: (names: string[], tagged: string[]) => void;
  /** Quản trị: lưu trạng thái LED hiện tại thành kịch bản. */
  onSavePreset?: (preset: Omit<LedScenePreset, "id" | "name">) => void;
  onError?: (message: string) => void;
};

export default function ModelViewer({ url, hotspots, led, onPick, onMaterials, onSavePreset, onError }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const ledMatsRef = useRef<Map<string, THREE.MeshStandardMaterial[]>>(new Map());
  const ledStateRef = useRef<{ effect: LedEffect; color: string; brightness: number; zoneColors: Record<string, string> }>({
    effect: "static",
    color: led.colors[0] ?? "#bf5af2",
    brightness: 1.5,
    zoneColors: {},
  });
  const applyLedRef = useRef<(t: number) => void>(() => {});
  const renderRef = useRef<() => void>(() => {});
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [ledNames, setLedNames] = useState<string[]>([]);
  const [color, setColor] = useState(led.colors[0] ?? "#bf5af2");
  const [brightness, setBrightness] = useState(1.5);
  const [effect, setEffect] = useState<LedEffect>("static");
  const [zone, setZone] = useState<string>("");
  const [zoneColors, setZoneColors] = useState<Record<string, string>>({});
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [ledOpen, setLedOpen] = useState(false);
  ledStateRef.current = { effect, color, brightness, zoneColors };
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const hotspotsRef = useRef(hotspots);
  hotspotsRef.current = hotspots;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.01, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.enableDamping = !reduce;
    controls.enablePan = false;

    const tmp = new THREE.Vector3();
    // Cờ cần vẽ lại: đổi kích thước, đổi LED, đổi hotspot, xoay camera.
    let dirty = true;
    controls.addEventListener("change", () => (dirty = true));
    const draw = () => {
      renderer.render(scene, camera);
      const box = labelsRef.current;
      if (!box) return;
      const w = host.clientWidth;
      const h = host.clientHeight;
      hotspotsRef.current.forEach((hs, i) => {
        const el = box.children[i] as HTMLElement | undefined;
        if (!el) return;
        tmp.set(...hs.position).project(camera);
        const visible = tmp.z < 1;
        el.style.display = visible ? "" : "none";
        el.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px) translate(-50%, -50%)`;
      });
    };
    const render = () => {
      dirty = true;
    };
    renderRef.current = render;

    let frame = 0;
    let active = true;
    const clock = new THREE.Clock();
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (!active || document.hidden) return;
      const animating = !reduce && ledStateRef.current.effect !== "static" && ledMatsRef.current.size > 0;
      if (animating) applyLedRef.current(clock.getElapsedTime());
      const moved = controls.update();
      if (moved || animating || dirty) {
        dirty = false;
        draw();
      }
    };
    loop();

    const io = new IntersectionObserver(([e]) => (active = Boolean(e?.isIntersecting)));
    io.observe(host);
    const ro = new ResizeObserver(() => {
      renderer.setSize(host.clientWidth, host.clientHeight);
      camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
      camera.updateProjectionMatrix();
      render();
    });
    ro.observe(host);

    const onVisible = () => (dirty = true);
    document.addEventListener("visibilitychange", onVisible);

    let root: THREE.Object3D | null = null;
    // Bộ giải nén chỉ nạp cùng chunk trình xem 3D; decoder Draco tự host tại /draco/.
    const draco = new DRACOLoader().setDecoderPath("/draco/");
    const loader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      url,
      (gltf) => {
        if (disposed) return;
        root = gltf.scene;
        scene.add(root);
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3()).length() || 1;
        const center = box.getCenter(new THREE.Vector3());
        controls.target.copy(center);
        camera.position.copy(center).add(new THREE.Vector3(size * 0.6, size * 0.35, size * 0.7));
        camera.near = size / 200;
        camera.far = size * 20;
        camera.updateProjectionMatrix();
        controls.minDistance = size * 0.1;
        controls.maxDistance = size * 3;
        const names = new Set<string>();
        const tagged = new Set<string>();
        root.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            if (!m?.name) return;
            names.add(m.name);
            if (isTaggedLed(m.name, m.userData) || isTaggedLed(mesh.name, mesh.userData)) tagged.add(m.name);
          });
        });
        const available = [...names].sort();
        onMaterials?.(available, [...tagged].sort());
        const matched = matchLedMaterials(led.materials, available);
        const byZone = new Map<string, THREE.MeshStandardMaterial[]>();
        root.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          list.forEach((m) => {
            const std = m as THREE.MeshStandardMaterial;
            if (!std || !("emissive" in std) || !matched.includes(std.name)) return;
            const arr = byZone.get(std.name) ?? [];
            if (!arr.includes(std)) arr.push(std);
            byZone.set(std.name, arr);
          });
        });
        // Giữ thứ tự vùng theo cấu hình để hiệu ứng chạy đuổi đúng hướng.
        ledMatsRef.current = new Map(matched.filter((z) => byZone.has(z)).map((z) => [z, byZone.get(z)!]));
        setLedNames([...ledMatsRef.current.keys()]);
        setLoaded(true);
        render();
      },
      (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
      () => onError?.("Không mở được mô hình 3D: file 3D lỗi hoặc dùng kiểu nén chưa hỗ trợ."),
    );

    const ray = new THREE.Raycaster();
    let start: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => (start = { x: e.clientX, y: e.clientY });
    const up = (e: PointerEvent) => {
      if (!pickRef.current || !root || !start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1),
        camera,
      );
      const hit = ray.intersectObject(root, true)[0];
      if (hit) pickRef.current([+hit.point.x.toFixed(4), +hit.point.y.toFixed(4), +hit.point.z.toFixed(4)]);
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointerup", up);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      io.disconnect();
      ro.disconnect();
      controls.dispose();
      root?.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry?.dispose();
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        list.forEach((m) => {
          if (!m) return;
          // Giải phóng mọi texture gắn vào material (map, emissiveMap, normalMap…).
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
          m.dispose();
        });
      });
      scene.environment = null;
      document.removeEventListener("visibilitychange", onVisible);
      draco.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, led.materials.join("|")]);

  useEffect(() => {
    const tmpColor = new THREE.Color();
    applyLedRef.current = (t: number) => {
      const st = ledStateRef.current;
      const zones = [...ledMatsRef.current.entries()];
      zones.forEach(([name, mats], i) => {
        const f = ledFrame(st.effect, t, i, zones.length);
        if (f.hue !== null) tmpColor.setHSL(f.hue, 1, 0.55);
        else tmpColor.set(st.zoneColors[name] ?? st.color);
        mats.forEach((m) => {
          m.emissive.copy(tmpColor);
          m.emissiveIntensity = st.brightness * f.level;
        });
      });
    };
    applyLedRef.current(0);
    renderRef.current();
  }, [color, brightness, zoneColors, effect, ledNames]);

  const applyPreset = (p: LedScenePreset) => {
    setActivePreset(p.id);
    setColor(p.color);
    setBrightness(p.brightness);
    setEffect(p.effect);
    setZoneColors(p.zoneColors);
  };
  const pickColor = (c: string) => {
    setActivePreset(null);
    if (zone) setZoneColors((z) => ({ ...z, [zone]: c }));
    else {
      setColor(c);
      setZoneColors({});
    }
  };
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => renderRef.current(), [hotspots]);

  return (
    <div className="absolute inset-0">
      <div
        ref={hostRef}
        tabIndex={0}
        role="application"
        aria-label="Mô hình 3D: kéo để xoay, chụm hoặc lăn chuột để phóng to"
        className={`absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-primary ${onPick ? "cursor-crosshair" : "cursor-grab"}`}
      />
      <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden">
        {hotspots.map((h) => (
          <span key={h.id} className="sk-pano-hotspot absolute top-0 left-0" style={{ display: "none" }}>
            <span className="sk-pano-hotspot__dot" />
            {h.label ? <span className="sk-pano-hotspot__label">{h.label}</span> : null}
          </span>
        ))}
      </div>
      {!loaded ? (
        <div className="absolute inset-x-0 bottom-3 text-center text-xs text-muted-foreground">
          Đang tải mô hình… {progress ? `${progress}%` : ""}
        </div>
      ) : null}
      {loaded && ledNames.length && !ledOpen ? (
        <button
          type="button"
          onClick={() => setLedOpen(true)}
          className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1.5 text-xs font-semibold backdrop-blur"
        >
          <span className="size-2.5 rounded-full" style={{ background: color }} />
          Điều khiển LED
        </button>
      ) : null}
      {loaded && ledNames.length && ledOpen ? (
        <div className="absolute inset-x-2 bottom-2 max-h-[55%] space-y-1.5 overflow-y-auto rounded-lg bg-background/85 p-2 backdrop-blur">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-[11px] text-muted-foreground">Mô phỏng LED trên mô hình 3D — màu thực tế có thể khác</p>
            <button type="button" onClick={() => setLedOpen(false)} className="text-[11px] underline">Thu gọn</button>
          </div>
          {led.presets.length ? (
            <div className="flex flex-wrap gap-1" aria-label="Kịch bản LED">
              {led.presets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={activePreset === p.id}
                  onClick={() => applyPreset(p)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${activePreset === p.id ? "border-primary text-primary" : "border-border"}`}
                >
                  <span className="size-2.5 rounded-full" style={{ background: p.color }} />
                  {p.name}
                </button>
              ))}
            </div>
          ) : null}
          {ledNames.length > 1 ? (
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              aria-label="Vùng LED"
              className="h-7 w-full rounded border border-border bg-background px-1 text-[11px]"
            >
              <option value="">Tất cả vùng LED</option>
              {ledNames.map((n) => (
                <option key={n} value={n}>Vùng: {n}</option>
              ))}
            </select>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5">
            {led.colors.map((c) => {
              const current = zone ? (zoneColors[zone] ?? color) : color;
              return (
                <button
                  key={c}
                  type="button"
                  aria-label={`Màu ${c}`}
                  aria-pressed={c === current}
                  onClick={() => pickColor(c)}
                  className={`size-6 rounded-full border-2 ${c === current ? "border-primary" : "border-border"}`}
                  style={{ background: c }}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={effect}
              onChange={(e) => { setActivePreset(null); setEffect(e.target.value as LedEffect); }}
              aria-label="Hiệu ứng"
              className="h-7 rounded border border-border bg-background px-1 text-[11px]"
            >
              {(Object.keys(LED_EFFECT_LABEL) as LedEffect[])
                .filter((e) => e !== "chase" || ledNames.length > 1)
                .map((e) => (
                  <option key={e} value={e}>{LED_EFFECT_LABEL[e]}</option>
                ))}
            </select>
            <label className="flex flex-1 items-center gap-1 text-[11px] text-muted-foreground">
              Độ sáng
              <input
                type="range"
                min={0}
                max={4}
                step={0.1}
                value={brightness}
                onChange={(e) => { setActivePreset(null); setBrightness(Number(e.target.value)); }}
                className="w-full accent-primary"
              />
            </label>
          </div>
          {reduceMotion && effect !== "static" ? (
            <p className="text-[10px] text-muted-foreground">Máy đang bật giảm chuyển động nên hiệu ứng hiển thị tĩnh.</p>
          ) : null}
          {onSavePreset ? (
            <button
              type="button"
              onClick={() => onSavePreset({ effect, color, brightness, zoneColors })}
              className="w-full rounded border border-primary px-2 py-1 text-[11px] font-semibold text-primary"
            >
              Lưu trạng thái này thành kịch bản
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
