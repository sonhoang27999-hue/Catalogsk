/**
 * Trình chỉnh "Màu sắc & giao diện" (chỉ admin).
 * - Xem trước trực tiếp: mọi thay đổi áp ngay lên giao diện thật qua một <style> tạm,
 *   chỉ ghi vào site_settings khi bấm "Lưu giao diện"; "Hủy" trả về như cũ.
 * - Bảng màu tự sinh từ màu chủ đạo bằng OKLCH (đảm bảo tương phản WCAG AA).
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  Copy,
  Dices,
  Download,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  saveSettings,
  settingsQueryOptions,
  THEME_RADIUS_KEY,
  THEME_SLOTS_KEY,
  THEME_VARS,
} from "@/data/settings.api";
import { toHex } from "@/lib/color";
import {
  buildThemeCss,
  contrast,
  DEFAULT_TITLE_GRADIENT,
  EFFECT_LIST,
  generatePalette,
  lchToHex,
  LIGHT_STYLES,
  parseEffects,
  parseLightStyle,
  parseMode,
  parseTexture,
  TEXTURES,
  THEME_LIGHT_STYLE_KEY,
  THEME_TEXTURE_KEY,
  parseSpeed,
  parseTitleGradient,
  THEME_ACCENT_KEY,
  THEME_ALL_KEYS,
  THEME_BG_LEVEL_KEY,
  THEME_EFFECTS_KEY,
  THEME_FX_SPEED_KEY,
  THEME_MODE_KEY,
  THEME_PRESET_KEY,
  THEME_TITLE_GRADIENT_KEY,
  themeDraftPayload,
  type EffectId,
  type FxSpeed,
  type ThemeMode,
} from "@/lib/themeEngine";

type Preset = {
  name: string;
  group: "car" | "dark" | "light" | "vivid";
  mode: "dark" | "light";
  values: Record<string, string>;
};

const p = (
  name: string,
  group: Preset["group"],
  mode: Preset["mode"],
  [bg, card, fg, muted, border, gold, brand]: string[],
  title?: string[],
): Preset => ({
  name,
  group,
  mode,
  values: {
    theme_background: bg!,
    theme_card: card!,
    theme_foreground: fg!,
    theme_muted_foreground: muted!,
    theme_border: border!,
    theme_gold: gold!,
    theme_brand: brand!,
    theme_primary: brand!,
    ...(title ? { theme_title_gradient: JSON.stringify(title) } : {}),
  },
});

/** Bộ màu mô phỏng đèn LED khoang lái các dòng xe sang (kèm gradient tiêu đề). */
const CAR_PRESETS: Preset[] = [
  p("Ocean Drive", "car", "dark",
    ["#060b14", "#0f1726", "#eef6ff", "#a8bdd6", "#1f2d44", "#2ee6f0", "#c03cff"],
    ["#22e3f0", "#7a5cff", "#e03cff"]),
  p("GT Acid", "car", "dark",
    ["#0b0c0d", "#1a1c1e", "#f2f4f2", "#b7bdb8", "#33373a", "#b6ff3c", "#6fcf2a"],
    ["#d8ff5c", "#7be22e", "#e8ffd0"]),
  p("M-Performance", "car", "dark",
    ["#070a12", "#121827", "#f4f7ff", "#b0bccf", "#26324a", "#5fb6ff", "#1c4fd6"],
    ["#7cc6ff", "#1c4fd6", "#e5262f"]),
  p("Dynamic RS", "car", "dark",
    ["#0c0c0d", "#1b1b1d", "#f6f6f6", "#bdbdc0", "#38383b", "#ff3b3b", "#c41d24"],
    ["#ff5a4d", "#c41d24", "#ffd2cc"]),
  p("Champagne", "car", "dark",
    ["#120d0a", "#211812", "#fbf4ea", "#cdbba5", "#3d2e22", "#e6c58a", "#a87b4a"],
    ["#fff1cf", "#e6c58a", "#b08350"]),
];

type ThemeSlot = { name: string; values: Record<string, string> };
const MAX_SLOTS = 5;
function parseSlots(raw?: string): ThemeSlot[] {
  try {
    const v = JSON.parse(raw || "[]");
    if (!Array.isArray(v)) return [];
    return v
      .filter((s) => s && typeof s.name === "string" && s.values && typeof s.values === "object")
      .map((s) => ({
        name: String(s.name).slice(0, 40),
        values: Object.fromEntries(
          THEME_ALL_KEYS.filter((k) => typeof s.values[k] === "string").map((k) => [k, s.values[k]]),
        ),
      }))
      .slice(0, MAX_SLOTS);
  } catch {
    return [];
  }
}

function ThemeSlots({
  slots,
  busy,
  onSaveCurrent,
  onApply,
  onDelete,
}: {
  slots: ThemeSlot[];
  busy: boolean;
  onSaveCurrent: (name: string) => void;
  onApply: (s: ThemeSlot) => void;
  onDelete: (i: number) => void;
}) {
  const [name, setName] = useState("");
  const full = slots.length >= MAX_SLOTS;
  return (
    <section>
      <SectionLabel>Mẫu giao diện đã lưu ({slots.length}/{MAX_SLOTS})</SectionLabel>
      {slots.length > 0 && (
        <div className="mb-2.5 space-y-1.5">
          {slots.map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-border px-2.5 py-2">
              <span
                className="size-6 shrink-0 rounded-md border border-border"
                style={{
                  background: `linear-gradient(135deg, ${s.values["theme_background"] ?? "#000"} 50%, ${toHex(s.values["theme_brand"] ?? "", "#3f6fd8")} 50%)`,
                }}
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{s.name}</span>
              <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => onApply(s)}>
                Áp dụng
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-7 text-xs text-destructive" disabled={busy} onClick={() => onDelete(i)}>
                Xóa
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder={full ? "Đã đủ 5 mẫu — xóa bớt để lưu" : "Tên mẫu, vd: Theme Tết"}
          disabled={full || busy}
          className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm text-foreground"
        />
        <Button
          type="button"
          size="sm"
          className="h-9"
          disabled={full || busy || !name.trim()}
          onClick={() => {
            onSaveCurrent(name.trim());
            setName("");
          }}
        >
          Lưu mẫu
        </Button>
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        Lưu giao diện đang xem thành mẫu. "Áp dụng" xem trước ngay, bấm "Lưu giao diện" để dùng cho mọi người.
      </p>
    </section>
  );
}

function ChoiceGrid<T extends string>({
  options,
  value,
  onChange,
  swatch,
}: {
  options: { id: T; label: string; hint: string }[];
  value: T;
  onChange: (v: T) => void;
  swatch?: boolean;
}) {
  const swatchStyle: Record<string, CSSProperties> = {
    none: { background: "var(--background)" },
    carbon: {
      background:
        "repeating-linear-gradient(45deg,#2a2a2e 0 2px,#151517 2px 6px),#151517",
    },
    oled: { background: "#000" },
    smoked: { background: "linear-gradient(135deg,#3a3f47aa,#0b0d10)" },
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-transform active:scale-[0.97] ${
              active ? "border-gold ring-2 ring-gold" : "border-border"
            }`}
          >
            {swatch && <span className="size-7 shrink-0 rounded-lg border border-border" style={swatchStyle[o.id]} />}
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-foreground">{o.label}</span>
              <span className="block truncate text-[10px] text-muted-foreground">{o.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const LIBRARY: Preset[] = [
  p("Tối + Gold", "dark", "dark", [
    "#0a0a0b",
    "#18181b",
    "#fafafa",
    "#d4d4d8",
    "#3f3f46",
    "#d4af37",
    "#3f6fd8",
  ]),
  p("Xanh đêm", "dark", "dark", [
    "#08131f",
    "#0f2033",
    "#eaf3ff",
    "#a9c1da",
    "#1e3a52",
    "#54c8f0",
    "#2b8fd6",
  ]),
  p("Tím ánh kim", "dark", "dark", [
    "#100a1c",
    "#1e1435",
    "#f6efff",
    "#c8b6e6",
    "#3a2a5c",
    "#c9a84c",
    "#7c4dff",
  ]),
  p("Thép đêm", "dark", "dark", [
    "#0b0f16",
    "#18202c",
    "#f2f6fb",
    "#b3c1d3",
    "#2f3c4d",
    "#8fb3d9",
    "#4d7fbd",
  ]),
  p("Xám carbon", "dark", "dark", [
    "#111214",
    "#1d1f22",
    "#f4f4f5",
    "#c4c6ca",
    "#3a3d42",
    "#e2e4e8",
    "#8a94a6",
  ]),
  p("Vàng đồng", "dark", "dark", [
    "#120d08",
    "#221912",
    "#fbf3e8",
    "#dcc7ad",
    "#45352a",
    "#e0a95a",
    "#c27a3a",
  ]),
  p("Sáng tối giản", "light", "light", [
    "#ffffff",
    "#ffffff",
    "#101014",
    "#5b5b66",
    "#e3e3e8",
    "#b8860b",
    "#1d4ed8",
  ]),
  p("Bình minh sáng", "light", "light", [
    "#fffaf6",
    "#ffffff",
    "#1c1410",
    "#6d5a50",
    "#f0dfd3",
    "#c4622a",
    "#c2512b",
  ]),
  p("Ngọc trai", "light", "light", [
    "#f6f7fb",
    "#ffffff",
    "#141824",
    "#576075",
    "#dde1ea",
    "#9a7b2f",
    "#4b5bd6",
  ]),
  p("Đỏ đen thể thao", "vivid", "dark", [
    "#0b0909",
    "#1a1212",
    "#fff5f5",
    "#e0bcbc",
    "#4a2424",
    "#ff4d3d",
    "#e5262f",
  ]),
  p("Xanh neon", "vivid", "dark", [
    "#05100f",
    "#0b1f1d",
    "#ecfffd",
    "#a6e4dc",
    "#16433e",
    "#3dffd8",
    "#00c2ff",
  ]),
  p("Hồng tím", "vivid", "dark", [
    "#140a16",
    "#24122a",
    "#fff0fb",
    "#e3b8dc",
    "#4a2552",
    "#ff7ad9",
    "#b24dff",
  ]),
  p("Xanh rừng", "vivid", "dark", [
    "#07120b",
    "#0f2216",
    "#effaf2",
    "#b2d6bd",
    "#21432d",
    "#c8d66a",
    "#2f9e5b",
  ]),
  p("Hoàng hôn", "vivid", "dark", [
    "#150a0d",
    "#2a1418",
    "#fff4ec",
    "#e2bfae",
    "#4d2a2f",
    "#f7a23b",
    "#e0574f",
  ]),
  p("Đại dương", "vivid", "dark", [
    "#04121f",
    "#0d2434",
    "#eafaff",
    "#a7cfdd",
    "#1c455c",
    "#43d4c4",
    "#1f8fbf",
  ]),
  p("Bạc hà", "vivid", "dark", [
    "#061a12",
    "#0e2b20",
    "#effff7",
    "#a8dcc4",
    "#1d4a37",
    "#3ee6a5",
    "#17a877",
  ]),
  ...CAR_PRESETS,
];

const GROUPS: { id: Preset["group"]; label: string }[] = [
  { id: "car", label: "LED khoang lái xe sang" },
  { id: "dark", label: "Tối sang trọng" },
  { id: "light", label: "Sáng" },
  { id: "vivid", label: "Rực rỡ" },
];

const ACCENT_SWATCHES = [
  "#d4af37",
  "#e5262f",
  "#ff6b3d",
  "#f5a142",
  "#2f9e5b",
  "#17a877",
  "#00c2ff",
  "#3f6fd8",
  "#4b5bd6",
  "#7c4dff",
  "#b24dff",
  "#ff4f9a",
];

const TITLE_GRADIENTS: string[][] = [
  DEFAULT_TITLE_GRADIENT,
  ["#f7d774", "#d4af37", "#fff4c2"],
  ["#ff4d3d", "#ff9a3d"],
  ["#00c2ff", "#3dffd8"],
  ["#ff7ad9", "#b24dff", "#5b8cff"],
  ["#e2e4e8", "#8a94a6", "#ffffff"],
];

const RADIUS_OPTIONS = [
  { label: "Vuông", value: "0rem" },
  { label: "Nhẹ", value: "0.375rem" },
  { label: "Vừa", value: "0.625rem" },
  { label: "Tròn", value: "1rem" },
];

const SPEEDS: { id: FxSpeed; label: string }[] = [
  { id: "slow", label: "Chậm" },
  { id: "medium", label: "Vừa" },
  { id: "fast", label: "Nhanh" },
];

const MODES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Sáng", icon: Sun },
  { id: "dark", label: "Tối", icon: Moon },
  { id: "auto", label: "Tự động", icon: Monitor },
];

type Tab = "library" | "accent" | "effects" | "details";
const TABS: { id: Tab; label: string }[] = [
  { id: "library", label: "Bộ màu" },
  { id: "accent", label: "Màu chủ đạo" },
  { id: "effects", label: "Hiệu ứng" },
  { id: "details", label: "Chi tiết" },
];

const HEX = /^#[0-9a-f]{6}$/i;
const SAFE = /^[a-zA-Z0-9#(),.%\s/:"{}[\]-]*$/;

function isActivePreset(current: Record<string, string>, preset: Record<string, string>) {
  return Object.entries(preset).every(
    ([key, value]) => (current[key] ?? "").toLowerCase() === value.toLowerCase(),
  );
}

function randomGradient(): string[] {
  const h = Math.random() * 360;
  const spread = 40 + Math.random() * 80;
  const n = Math.random() > 0.4 ? 3 : 2;
  return Array.from({ length: n }, (_, i) =>
    lchToHex({ L: 0.74 + Math.random() * 0.12, C: 0.17, H: (h + i * spread) % 360 }),
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string; icon?: typeof Sun }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="grid gap-1 rounded-xl border border-border bg-secondary/40 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}
    >
      {options.map((o) => {
        const Icon = o.icon;
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
              active ? "bg-gold text-gold-foreground shadow" : "text-foreground hover:bg-secondary"
            }`}
          >
            {Icon && <Icon className="size-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Mini xem trước: tiêu đề, thẻ sản phẩm và nút — dùng đúng các lớp hiệu ứng thật. */
function MiniPreview({ gradient }: { gradient: string[] }) {
  return (
    <div className="sk-theme-preview rounded-2xl border border-border bg-background p-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p
            className="sk-gradient-text sk-title-sweep inline-block text-3xl leading-none font-extrabold"
            data-text="SK"
            style={{ "--sk-sweep-delay": "0.2s" } as CSSProperties}
          >
            SK
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground">Ambient Light Luxury</p>
        </div>
        <div className="flex gap-1">
          {gradient.map((c, i) => (
            <span
              key={i}
              className="size-3 rounded-full border border-border"
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto] items-stretch gap-3">
        <div className="sk-edge sk-product-card sk-shimmer overflow-hidden rounded-lg">
          <div className="sk-placeholder relative h-14">
            <span className="sk-discount absolute top-1.5 right-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-white">
              -15%
            </span>
          </div>
          <div className="space-y-0.5 px-2.5 py-2">
            <p className="truncate text-xs font-bold text-foreground">LED nội thất S2 Pro</p>
            <p className="text-[10px] text-muted-foreground line-through">2.500.000đ</p>
            <p className="sk-gradient-text text-sm font-extrabold">2.125.000đ</p>
          </div>
        </div>
        <div className="flex w-24 flex-col justify-center gap-2">
          <span className="rounded-lg bg-primary px-2 py-2 text-center text-[11px] font-bold text-primary-foreground">
            Gọi tư vấn
          </span>
          <span className="rounded-lg bg-gold px-2 py-2 text-center text-[11px] font-bold text-gold-foreground">
            Đang chọn
          </span>
          <span className="rounded-lg border border-border px-2 py-2 text-center text-[11px] font-semibold text-foreground">
            Nút phụ
          </span>
        </div>
      </div>
    </div>
  );
}

export function ThemeManager() {
  const qc = useQueryClient();
  const settings = useQuery(settingsQueryOptions);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("accent");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [importText, setImportText] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const base = useMemo(() => settings.data ?? {}, [settings.data]);
  const dirty = Object.keys(draft).length > 0;

  /** Giá trị hiện hành (đã lưu + bản nháp). Màu luôn ở dạng HEX để so sánh/hiển thị. */
  const current = useMemo(() => {
    const out: Record<string, string> = {};
    for (const key of THEME_ALL_KEYS) {
      const v = draft[key] ?? base[key];
      if (v !== undefined && v !== "") out[key] = v;
    }
    for (const v of THEME_VARS) {
      out[v.key] = toHex(draft[v.key] ?? base[v.key] ?? "", v.fallback);
    }
    out[THEME_RADIUS_KEY] = draft[THEME_RADIUS_KEY] ?? base[THEME_RADIUS_KEY] ?? "0.625rem";
    return out;
  }, [draft, base]);

  const mode = parseMode(current[THEME_MODE_KEY]);
  const effects = parseEffects(current[THEME_EFFECTS_KEY]);
  const speed = parseSpeed(current[THEME_FX_SPEED_KEY]);
  const gradient = parseTitleGradient(current[THEME_TITLE_GRADIENT_KEY]);
  const accentValue = current[THEME_ACCENT_KEY] ?? "";
  const accent = HEX.test(accentValue)
    ? accentValue
    : (current["theme_brand"] ?? "#3f6fd8");
  const bgLevel = Number(current[THEME_BG_LEVEL_KEY] ?? 20) || 0;
  const activePreset = LIBRARY.find((pr) => isActivePreset(current, pr.values));
  const texture = parseTexture(current[THEME_TEXTURE_KEY]);
  const lightStyle = parseLightStyle(current[THEME_LIGHT_STYLE_KEY]);
  const slots = parseSlots(base[THEME_SLOTS_KEY]);

  /* ----- Xem trước trực tiếp ----- */
  const previewCss = open && dirty ? buildThemeCss({ ...base, ...draft }) : "";
  useEffect(() => {
    if (!previewCss) return;
    const el = document.getElementById("sk-theme") as HTMLStyleElement | null;
    if (el?.sheet) el.sheet.disabled = true;
    return () => {
      if (el?.sheet) el.sheet.disabled = false;
    };
  }, [previewCss]);

  const patch = (values: Record<string, string>) => setDraft((d) => ({ ...d, ...values }));

  const regenerate = (next: { accent?: string; mode?: ThemeMode; level?: number }) => {
    const a = next.accent ?? accent;
    const m = next.mode ?? mode;
    const l = next.level ?? bgLevel;
    patch({
      ...generatePalette(a, m === "light" ? "light" : "dark", l),
      [THEME_ACCENT_KEY]: a,
      [THEME_MODE_KEY]: m,
      [THEME_BG_LEVEL_KEY]: String(l),
      [THEME_PRESET_KEY]: "",
    });
  };

  const setEffect = (id: EffectId, change: Partial<{ on: boolean; level: number }>) => {
    const next = { ...effects, [id]: { ...effects[id], ...change } };
    patch({ [THEME_EFFECTS_KEY]: JSON.stringify(next) });
  };

  const setGradient = (colors: string[]) =>
    patch({ [THEME_TITLE_GRADIENT_KEY]: JSON.stringify(colors) });

  const close = () => {
    if (save.isPending || reset.isPending) return;
    setDraft({});
    setImportOpen(false);
    setOpen(false);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (reset.isPending) return;
      await saveSettings(themeDraftPayload(draft));
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: settingsQueryOptions.queryKey });
      setDraft({});
      setOpen(false);
      toast.success("Đã lưu giao diện.");
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được."),
  });

  const reset = useMutation({
    mutationFn: async () => {
      if (save.isPending) return;
      const payload: Record<string, string> = {};
      for (const key of THEME_ALL_KEYS) payload[key] = "";
      await saveSettings(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: settingsQueryOptions.queryKey });
      setDraft({});
      setConfirmReset(false);
      toast.success("Đã khôi phục giao diện mặc định.");
    },
    onError: (e: Error) => toast.error(e.message || "Không khôi phục được."),
  });
  const slotsMut = useMutation({
    mutationFn: (next: ThemeSlot[]) =>
      saveSettings({ [THEME_SLOTS_KEY]: JSON.stringify(next) }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: settingsQueryOptions.queryKey });
      toast.success("Đã cập nhật mẫu giao diện.");
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được mẫu."),
  });
  const saveSlots = (next: ThemeSlot[]) => slotsMut.mutate(next.slice(0, MAX_SLOTS));
  const busy = save.isPending || reset.isPending || slotsMut.isPending;

  /** Ảnh chụp giao diện hiện hành (đã lưu + nháp) để lưu thành mẫu. */
  const snapshot = () => {
    const values = { ...base, ...draft };
    const out: Record<string, string> = {};
    for (const key of THEME_ALL_KEYS) if (values[key]) out[key] = values[key]!;
    return out;
  };

  const exportJson = async () => {
    const out: Record<string, string> = {};
    const values = { ...base, ...draft };
    for (const key of THEME_ALL_KEYS) {
      const value = values[key];
      if (value) out[key] = value;
    }
    const text = JSON.stringify({ type: "sk-theme", version: 1, values: out }, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép giao diện (JSON) vào bộ nhớ tạm.");
    } catch {
      setImportText(text);
      setImportOpen(true);
      toast.message("Không sao chép tự động được — hãy sao chép nội dung trong ô.");
    }
  };

  const importJson = () => {
    try {
      const parsed = JSON.parse(importText) as { type?: string; values?: Record<string, unknown> };
      const src = (parsed?.values ?? parsed) as Record<string, unknown>;
      const next: Record<string, string> = {};
      for (const key of THEME_ALL_KEYS) {
        const v = src?.[key];
        if (typeof v === "string" && v.length < 600 && SAFE.test(v)) {
          next[key] = THEME_VARS.some((t) => t.key === key) ? toHex(v, "") || v : v;
        }
      }
      if (!Object.keys(next).length && !(parsed.type === "sk-theme" && parsed.values)) throw new Error();
      if (parsed.type === "sk-theme" && parsed.values) {
        setDraft({ ...Object.fromEntries(THEME_ALL_KEYS.map((key) => [key, ""])), ...next });
      } else {
        patch(next);
      }
      setImportOpen(false);
      setImportText("");
      toast.success("Đã nạp giao diện — kiểm tra rồi bấm Lưu.");
    } catch {
      toast.error("Nội dung JSON không hợp lệ.");
    }
  };

  const muteContrast = contrast(
    current["theme_muted_foreground"] ?? "",
    current["theme_card"] ?? "",
  );

  return (
    <>
      {previewCss &&
        typeof document !== "undefined" &&
        createPortal(
          <style data-theme-preview="" dangerouslySetInnerHTML={{ __html: previewCss }} />,
          document.body,
        )}
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <Palette className="size-4" /> Màu sắc & giao diện
          </Button>
        </DialogTrigger>
        <DialogContent
          overlayClassName="bg-black/25"
          className="max-h-[90dvh] w-[calc(100vw-16px)] max-w-[460px] gap-0 overflow-hidden rounded-3xl border border-border bg-background p-0 shadow-2xl"
        >
          <div className="flex max-h-[90dvh] flex-col">
            <div className="px-5 pt-5 pb-3">
              <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                Màu sắc & giao diện
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                Thay đổi hiện ngay trên trang phía sau — chỉ lưu khi bấm "Lưu giao diện".
              </DialogDescription>
            </div>

            <div className="px-5 pb-3">
              <MiniPreview gradient={gradient} />
            </div>

            <div className="border-b border-border px-3">
              <div role="tablist" className="flex gap-1 overflow-x-auto">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    type="button"
                    aria-selected={tab === t.id}
                    onClick={() => setTab(t.id)}
                    className={`shrink-0 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                      tab === t.id
                        ? "border-gold text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {tab === "library" && (
                <ThemeSlots
                  slots={slots}
                  busy={busy}
                  onSaveCurrent={(name) => saveSlots([...slots, { name, values: snapshot() }])}
                  onApply={(s) =>
                    setDraft({
                      ...Object.fromEntries(THEME_ALL_KEYS.map((key) => [key, ""])),
                      ...s.values,
                    })
                  }
                  onDelete={(i) => saveSlots(slots.filter((_, j) => j !== i))}
                />
              )}
              {tab === "library" &&
                GROUPS.map((g) => (
                  <section key={g.id}>
                    <SectionLabel>{g.label}</SectionLabel>
                    <div className="grid grid-cols-2 gap-2.5">
                      {LIBRARY.filter((pr) => pr.group === g.id).map((pr) => {
                        const active = activePreset?.name === pr.name;
                        const v = pr.values;
                        return (
                          <button
                            key={pr.name}
                            type="button"
                            onClick={() =>
                              patch({
                                ...v,
                                [THEME_MODE_KEY]: pr.mode,
                                [THEME_ACCENT_KEY]: v["theme_brand"]!,
                                [THEME_PRESET_KEY]: pr.name,
                              })
                            }
                            className={`relative overflow-hidden rounded-2xl border text-left transition-transform active:scale-[0.97] ${
                              active ? "border-gold ring-2 ring-gold" : "border-border"
                            }`}
                          >
                            <div className="p-2.5" style={{ background: v["theme_background"] }}>
                              <div
                                className="rounded-lg border p-2"
                                style={{
                                  background: v["theme_card"],
                                  borderColor: v["theme_border"],
                                }}
                              >
                                <div
                                  className="h-1.5 w-3/4 rounded-full"
                                  style={{ background: v["theme_foreground"] }}
                                />
                                <div
                                  className="mt-1 h-1 w-1/2 rounded-full"
                                  style={{ background: v["theme_muted_foreground"] }}
                                />
                                <div className="mt-2 flex gap-1">
                                  <span
                                    className="h-3 flex-1 rounded"
                                    style={{ background: v["theme_brand"] }}
                                  />
                                  <span
                                    className="h-3 w-5 rounded"
                                    style={{ background: v["theme_gold"] }}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between bg-card px-2.5 py-1.5">
                              <span className="truncate text-xs font-semibold text-foreground">
                                {pr.name}
                              </span>
                              {active && (
                                <span className="flex size-4 items-center justify-center rounded-full bg-gold">
                                  <Check className="size-3 text-gold-foreground" strokeWidth={3} />
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}

              {tab === "accent" && (
                <>
                  <section>
                    <SectionLabel>Màu chủ đạo</SectionLabel>
                    <div className="grid grid-cols-6 gap-2">
                      {ACCENT_SWATCHES.map((c) => {
                        const active = accent.toLowerCase() === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            aria-label={`Chọn màu ${c}`}
                            onClick={() => regenerate({ accent: c })}
                            className={`flex aspect-square items-center justify-center rounded-xl border border-border transition-transform active:scale-90 ${
                              active
                                ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                                : ""
                            }`}
                            style={{ background: c }}
                          >
                            {active && (
                              <Check
                                className="size-4 drop-shadow"
                                style={{ color: "#fff" }}
                                strokeWidth={3}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <label className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                      <span className="text-sm text-foreground">Chọn tự do</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{accent}</span>
                        <input
                          type="color"
                          value={accent}
                          onChange={(e) => regenerate({ accent: e.target.value })}
                          className="size-8 cursor-pointer rounded-lg border border-border bg-transparent"
                        />
                      </span>
                    </label>
                  </section>

                  <section>
                    <SectionLabel>Chế độ</SectionLabel>
                    <Segmented
                      options={MODES}
                      value={mode}
                      onChange={(m) => regenerate({ mode: m })}
                    />
                    {mode === "auto" && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Tự đổi Sáng/Tối theo cài đặt điện thoại của khách.
                      </p>
                    )}
                  </section>

                  <section>
                    <div className="mb-2.5 flex items-center justify-between">
                      <SectionLabel>Độ sáng nền</SectionLabel>
                      <span className="text-xs text-muted-foreground">{bgLevel}%</span>
                    </div>
                    <Slider
                      value={[bgLevel]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => regenerate({ level: v ?? 0 })}
                    />
                  </section>

                  <p className="rounded-xl bg-secondary/50 px-3 py-2 text-[11px] text-muted-foreground">
                    Viền, màu phụ, chữ mờ và màu nhấn được tự sinh hài hòa. Độ tương phản chữ phụ:{" "}
                    <b className="text-foreground">{muteContrast.toFixed(1)}:1</b>{" "}
                    {muteContrast >= 4.5 ? "(đạt chuẩn AA)" : "(nên tăng)"}
                  </p>
                </>
              )}

              {tab === "effects" && (
                <>
                  <section>
                    <SectionLabel>Tốc độ hiệu ứng</SectionLabel>
                    <Segmented
                      options={SPEEDS}
                      value={speed}
                      onChange={(s) => patch({ [THEME_FX_SPEED_KEY]: s })}
                    />
                  </section>

                  <section>
                    <SectionLabel>Kiểu nhịp sáng LED</SectionLabel>
                    <ChoiceGrid
                      options={LIGHT_STYLES}
                      value={lightStyle}
                      onChange={(v) => patch({ [THEME_LIGHT_STYLE_KEY]: v })}
                    />
                  </section>

                  <section>
                    <SectionLabel>Chất liệu nền</SectionLabel>
                    <ChoiceGrid
                      options={TEXTURES}
                      value={texture}
                      onChange={(v) => patch({ [THEME_TEXTURE_KEY]: v })}
                      swatch
                    />
                  </section>

                  <section className="space-y-2">
                    <SectionLabel>Hiệu ứng ánh sáng</SectionLabel>
                    {EFFECT_LIST.map((e) => (
                      <div key={e.id} className="rounded-xl border border-border px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{e.label}</p>
                            <p className="text-[11px] text-muted-foreground">{e.hint}</p>
                          </div>
                          <Switch
                            checked={effects[e.id].on}
                            onCheckedChange={(on) => setEffect(e.id, { on })}
                            aria-label={e.label}
                          />
                        </div>
                        {effects[e.id].on && (
                          <div className="mt-2.5 flex items-center gap-3">
                            <span className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground">Cường độ</span>
                            <Slider
                              value={[effects[e.id].level]}
                              min={10}
                              max={100}
                              step={5}
                              onValueChange={([v]) => setEffect(e.id, { level: v ?? 50 })}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    <p className="text-[11px] text-muted-foreground">
                      Máy bật "Giảm chuyển động" sẽ tự tắt toàn bộ hiệu ứng.
                    </p>
                  </section>

                  <section>
                    <div className="mb-2.5 flex items-center justify-between">
                      <SectionLabel>Gradient tiêu đề & logo SK</SectionLabel>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-lg text-xs"
                        onClick={() => setGradient(randomGradient())}
                      >
                        <Dices className="size-3.5" /> Ngẫu nhiên
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {TITLE_GRADIENTS.map((g, i) => {
                        const active = g.join() === gradient.join();
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setGradient(g)}
                            className={`h-9 rounded-xl border ${active ? "border-gold ring-2 ring-gold" : "border-border"}`}
                            style={{ backgroundImage: `linear-gradient(110deg, ${g.join(",")})` }}
                            aria-label={`Gradient ${i + 1}`}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      {gradient.map((c, i) => (
                        <input
                          key={i}
                          type="color"
                          value={c}
                          onChange={(e) => {
                            const next = [...gradient];
                            next[i] = e.target.value;
                            setGradient(next);
                          }}
                          className="size-9 cursor-pointer rounded-lg border border-border bg-transparent"
                          aria-label={`Màu ${i + 1}`}
                        />
                      ))}
                      {gradient.length < 3 ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => setGradient([...gradient, "#ffffff"])}
                        >
                          + Thêm màu
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => setGradient(gradient.slice(0, 2))}
                        >
                          Dùng 2 màu
                        </Button>
                      )}
                    </div>
                  </section>
                </>
              )}

              {tab === "details" && (
                <>
                  {mode === "auto" && (
                    <p className="text-xs text-muted-foreground">
                      Chọn Sáng hoặc Tối để chỉnh từng màu; Tự động dùng bộ màu theo thiết bị.
                    </p>
                  )}
                  <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        <span className="flex items-center gap-2">
                          <SlidersHorizontal className="size-4 text-muted-foreground" />
                          Tùy chỉnh chi tiết
                        </span>
                        <ChevronDown
                          className={`size-4 text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-2">
                      {THEME_VARS.map((v) => (
                        <label
                          key={v.key}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                        >
                          <span className="text-sm text-foreground">{v.label}</span>
                          <input
                            type="color"
                            disabled={mode === "auto"}
                            value={current[v.key] ?? v.fallback}
                            onChange={(e) =>
                              patch({ [v.key]: e.target.value, [THEME_PRESET_KEY]: "" })
                            }
                            className="size-8 cursor-pointer rounded-lg border border-border bg-transparent"
                          />
                        </label>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  <section>
                    <SectionLabel>Độ bo góc</SectionLabel>
                    <div className="flex flex-wrap gap-2">
                      {RADIUS_OPTIONS.map((r) => {
                        const active = current[THEME_RADIUS_KEY] === r.value;
                        return (
                          <button
                            key={r.value}
                            type="button"
                            onClick={() => patch({ [THEME_RADIUS_KEY]: r.value })}
                            className={`rounded-xl border px-4 py-2 text-xs font-medium transition-colors ${
                              active
                                ? "border-gold bg-gold text-gold-foreground"
                                : "border-border text-foreground hover:bg-secondary"
                            }`}
                          >
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section>
                    <SectionLabel>Sao lưu giao diện</SectionLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={exportJson}
                      >
                        <Download className="size-4" /> Xuất (copy)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setImportOpen((o) => !o)}
                      >
                        <Upload className="size-4" /> Nhập
                      </Button>
                    </div>
                    {importOpen && (
                      <div className="mt-2 space-y-2">
                        <Textarea
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          placeholder='Dán JSON giao diện vào đây ({"type":"sk-theme", ...})'
                          className="min-h-28 font-mono text-xs"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-lg"
                            onClick={importJson}
                            disabled={!importText.trim()}
                          >
                            <Sparkles className="size-3.5" /> Áp dụng thử
                          </Button>
                          {importText && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="rounded-lg"
                              onClick={() =>
                                navigator.clipboard
                                  ?.writeText(importText)
                                  .then(() => toast.success("Đã sao chép."))
                              }
                            >
                              <Copy className="size-3.5" /> Sao chép
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </section>

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full rounded-xl"
                    disabled={busy}
                    onClick={() => setConfirmReset(true)}
                  >
                    <RotateCcw className="size-4" /> Khôi phục mặc định
                  </Button>
                </>
              )}
            </div>

            <div className="sticky bottom-0 grid grid-cols-2 gap-3 border-t border-border bg-background/95 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
              <Button variant="secondary" disabled={busy} onClick={close} className="rounded-xl py-5 font-semibold">
                Hủy
              </Button>
              <Button
                disabled={busy || !dirty}
                onClick={() => save.mutate()}
                className="rounded-xl bg-primary py-5 font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
              >
                {save.isPending ? "Đang lưu..." : "Lưu giao diện"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmReset} onOpenChange={(next) => { if (!busy) setConfirmReset(next); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục giao diện mặc định?</AlertDialogTitle>
            <AlertDialogDescription>
              Toàn bộ màu sắc, hiệu ứng và gradient tiêu đề đã lưu sẽ trở về mặc định cho mọi khách.
              Nên "Xuất" giao diện hiện tại trước nếu muốn dùng lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Không</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => reset.mutate()}>Khôi phục</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
