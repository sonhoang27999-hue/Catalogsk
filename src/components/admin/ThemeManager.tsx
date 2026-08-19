/**
 * Tuỳ chỉnh màu sắc & giao diện (chỉ admin).
 * Lưu vào site_settings, áp dụng tức thì qua <ThemeApplier />.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Palette, RotateCcw, SlidersHorizontal } from "lucide-react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  saveSettings,
  settingsQueryOptions,
  THEME_RADIUS_KEY,
  THEME_VARS,
} from "@/data/settings.api";
import { hexToOklch, toHex } from "@/lib/color";

const PRESETS: { name: string; values: Record<string, string> }[] = [
  {
    name: "Tối + Gold",
    values: {
      theme_background: "#0a0a0b",
      theme_card: "#18181b",
      theme_foreground: "#fafafa",
      theme_muted_foreground: "#d4d4d8",
      theme_border: "#3f3f46",
      theme_gold: "#d4af37",
      theme_brand: "#3f6fd8",
      theme_primary: "#3f6fd8",
    },
  },
  {
    name: "Sáng tối giản",
    values: {
      theme_background: "#ffffff",
      theme_card: "#ffffff",
      theme_foreground: "#101014",
      theme_muted_foreground: "#5b5b66",
      theme_border: "#e3e3e8",
      theme_gold: "#b8860b",
      theme_brand: "#1d4ed8",
      theme_primary: "#1d4ed8",
    },
  },
  {
    name: "Xanh đêm",
    values: {
      theme_background: "#08131f",
      theme_card: "#0f2033",
      theme_foreground: "#eaf3ff",
      theme_muted_foreground: "#a9c1da",
      theme_border: "#1e3a52",
      theme_gold: "#54c8f0",
      theme_brand: "#2b8fd6",
      theme_primary: "#2b8fd6",
    },
  },
];

const GRADIENT_PRESETS: {
  name: string;
  from: string;
  via: string;
  to: string;
  values: Record<string, string>;
}[] = [
  {
    name: "Hoàng hôn",
    from: "#2a0f14",
    via: "#b23a48",
    to: "#f7a23b",
    values: {
      theme_background: "#150a0d",
      theme_card: "#2a1418",
      theme_foreground: "#fff4ec",
      theme_muted_foreground: "#e2bfae",
      theme_border: "#4d2a2f",
      theme_gold: "#f7a23b",
      theme_brand: "#e0574f",
      theme_primary: "#e0574f",
    },
  },
  {
    name: "Đại dương",
    from: "#04121f",
    via: "#0e5a7a",
    to: "#43d4c4",
    values: {
      theme_background: "#04121f",
      theme_card: "#0d2434",
      theme_foreground: "#eafaff",
      theme_muted_foreground: "#a7cfdd",
      theme_border: "#1c455c",
      theme_gold: "#43d4c4",
      theme_brand: "#1f8fbf",
      theme_primary: "#1f8fbf",
    },
  },
  {
    name: "Tím ánh kim",
    from: "#120a24",
    via: "#5b2ea6",
    to: "#c9a84c",
    values: {
      theme_background: "#100a1c",
      theme_card: "#1e1435",
      theme_foreground: "#f6efff",
      theme_muted_foreground: "#c8b6e6",
      theme_border: "#3a2a5c",
      theme_gold: "#c9a84c",
      theme_brand: "#7c4dff",
      theme_primary: "#7c4dff",
    },
  },
  {
    name: "Bình minh sáng",
    from: "#ffffff",
    via: "#ffe7d1",
    to: "#ff8a5c",
    values: {
      theme_background: "#fffaf6",
      theme_card: "#ffffff",
      theme_foreground: "#1c1410",
      theme_muted_foreground: "#6d5a50",
      theme_border: "#f0dfd3",
      theme_gold: "#e07a3f",
      theme_brand: "#d95f36",
      theme_primary: "#d95f36",
    },
  },
  {
    name: "Bạc hà",
    from: "#04180f",
    via: "#12694a",
    to: "#73ffb8",
    values: {
      theme_background: "#061a12",
      theme_card: "#0e2b20",
      theme_foreground: "#effff7",
      theme_muted_foreground: "#a8dcc4",
      theme_border: "#1d4a37",
      theme_gold: "#3ee6a5",
      theme_brand: "#17a877",
      theme_primary: "#17a877",
    },
  },
  {
    name: "Thép đêm",
    from: "#0b0f16",
    via: "#2b3a4f",
    to: "#8fb3d9",
    values: {
      theme_background: "#0b0f16",
      theme_card: "#18202c",
      theme_foreground: "#f2f6fb",
      theme_muted_foreground: "#b3c1d3",
      theme_border: "#2f3c4d",
      theme_gold: "#8fb3d9",
      theme_brand: "#4d7fbd",
      theme_primary: "#4d7fbd",
    },
  },
];

const RADIUS_OPTIONS = [
  { label: "Vuông", value: "0rem" },
  { label: "Nhẹ", value: "0.375rem" },
  { label: "Vừa", value: "0.625rem" },
  { label: "Tròn", value: "1rem" },
];

function isActivePreset(current: Record<string, string>, preset: Record<string, string>) {
  return Object.entries(preset).every(([key, value]) => {
    const currentValue = current[key]?.trim();
    return currentValue === value || toHex(currentValue ?? "", value) === value;
  });
}

function isActiveGradient(current: Record<string, string>, preset: Record<string, string>) {
  return isActivePreset(current, preset);
}

export function ThemeManager() {
  const qc = useQueryClient();
  const settings = useQuery(settingsQueryOptions);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const current = useMemo(() => {
    const out: Record<string, string> = {};
    for (const v of THEME_VARS) {
      out[v.key] = draft[v.key] ?? toHex(settings.data?.[v.key] ?? "", v.fallback);
    }
    out[THEME_RADIUS_KEY] =
      draft[THEME_RADIUS_KEY] ?? settings.data?.[THEME_RADIUS_KEY] ?? "0.625rem";
    return out;
  }, [draft, settings.data]);

  const activePreset = useMemo(
    () => PRESETS.find((p) => isActivePreset(current, p.values)),
    [current],
  );
  const activeGradient = useMemo(
    () => GRADIENT_PRESETS.find((g) => isActiveGradient(current, g.values)),
    [current],
  );

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      for (const v of THEME_VARS) payload[v.key] = hexToOklch(current[v.key] ?? "") ?? "";
      payload[THEME_RADIUS_KEY] = current[THEME_RADIUS_KEY] ?? "";
      await saveSettings(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: settingsQueryOptions.queryKey });
      setDraft({});
      setOpen(false);
      toast.success("Đã cập nhật giao diện.");
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được."),
  });

  const reset = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = { [THEME_RADIUS_KEY]: "" };
      for (const v of THEME_VARS) payload[v.key] = "";
      await saveSettings(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: settingsQueryOptions.queryKey });
      setDraft({});
      toast.success("Đã khôi phục giao diện mặc định.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Palette className="size-4" /> Màu sắc & giao diện
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-24px)] max-w-[420px] overflow-hidden rounded-3xl border border-border bg-background p-0 shadow-2xl">
        <div className="flex max-h-[85vh] flex-col">
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Màu giao diện
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Tùy chỉnh sắc thái cho ứng dụng của bạn
              </DialogDescription>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-4">
            {/* Solid presets */}
            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Bộ màu có sẵn
              </p>
              <div className="grid grid-cols-5 gap-3">
                {PRESETS.map((p) => {
                  const active = activePreset?.name === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, ...p.values }))}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-border transition-transform active:scale-95"
                      title={p.name}
                    >
                      <span className="absolute inset-0 flex">
                        {[p.values["theme_background"], p.values["theme_card"], p.values["theme_gold"]].map(
                          (c, i) => (
                            <span key={i} className="flex-1" style={{ backgroundColor: c }} />
                          ),
                        )}
                      </span>
                      {active && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/20 ring-2 ring-gold ring-offset-2 ring-offset-background">
                          <Check className="size-4 text-white drop-shadow-md" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((p) => {
                  const active = activePreset?.name === p.name;
                  return (
                    <span
                      key={p.name}
                      className={`text-xs ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
                    >
                      {p.name}
                    </span>
                  );
                })}
              </div>
            </section>

            {/* Gradient presets */}
            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Dải màu gradient
              </p>
              <div className="grid grid-cols-3 gap-3">
                {GRADIENT_PRESETS.map((g) => {
                  const active = activeGradient?.name === g.name;
                  return (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, ...g.values }))}
                      className={`relative h-12 overflow-hidden rounded-xl transition-transform active:scale-95 ${
                        active ? "ring-2 ring-gold ring-offset-2 ring-offset-background" : "border border-border"
                      }`}
                      title={g.name}
                    >
                      <span
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${g.from}, ${g.via}, ${g.to})`,
                        }}
                      />
                      {active && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <Check className="size-4 text-white drop-shadow-md" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-3 text-center">
                {GRADIENT_PRESETS.map((g) => {
                  const active = activeGradient?.name === g.name;
                  return (
                    <span
                      key={g.name}
                      className={`text-[10px] ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
                    >
                      {g.name}
                    </span>
                  );
                })}
              </div>
            </section>

            {/* Advanced custom colors */}
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
              <CollapsibleContent className="mt-3 space-y-2 overflow-hidden transition-all data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
                {THEME_VARS.map((v) => (
                  <label
                    key={v.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <span className="text-sm text-foreground">{v.label}</span>
                    <input
                      type="color"
                      value={current[v.key] ?? v.fallback}
                      onChange={(e) => setDraft((d) => ({ ...d, [v.key]: e.target.value }))}
                      className="size-8 cursor-pointer rounded-lg border border-border bg-transparent"
                    />
                  </label>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Radius */}
            <section>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Độ bo góc
              </p>
              <div className="flex flex-wrap gap-2">
                {RADIUS_OPTIONS.map((r) => {
                  const active = current[THEME_RADIUS_KEY] === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, [THEME_RADIUS_KEY]: r.value }))}
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
          </div>

          {/* Footer actions */}
          <div className="grid grid-cols-2 gap-3 border-t border-border bg-secondary/30 px-6 py-4">
            <Button
              variant="secondary"
              disabled={reset.isPending}
              onClick={() => reset.mutate()}
              className="rounded-xl py-5 font-semibold"
            >
              <RotateCcw className="size-4" /> Mặc định
            </Button>
            <Button
              disabled={save.isPending}
              onClick={() => save.mutate()}
              className="rounded-xl bg-primary py-5 font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              Lưu giao diện
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
