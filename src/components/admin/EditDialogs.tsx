/**
 * Nút "Sửa" (chỉ admin thấy) cho từng mục riêng biệt:
 * hãng xe, đời xe, năm sản xuất, tầng trong cây linh hoạt và sản phẩm.
 */
import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveDealerPrice, saveRow, toSlug } from "@/data/admin.api";
import { useRefreshCatalog } from "@/hooks/useRefreshCatalog";
import { ImageUrlPreview } from "./ImageUrlPreview";
import { Field } from "./AddTile";

export type EditKind = "category" | "series" | "model" | "node" | "product";

const TABLE: Record<EditKind, "categories" | "series" | "models" | "nodes" | "products"> = {
  category: "categories",
  series: "series",
  model: "models",
  node: "nodes",
  product: "products",
};

const LABEL: Record<EditKind, string> = {
  category: "hãng xe",
  series: "đời xe",
  model: "năm sản xuất",
  node: "mục",
  product: "sản phẩm",
};

export type EditValues = {
  name: string;
  icon?: string;
  imageUrl?: string;
  layout?: "classic" | "tree";
  years?: string;
  description?: string;
  videoUrl?: string;
  detailUrl?: string;
  price?: number;
  salePrice?: number | null;
  dealerPrice?: number | null;
  brand?: string;
  origin?: string;
};

/** Chỉ giữ lại link ảnh do admin nhập, bỏ qua ảnh mặc định đóng gói trong app. */
export const externalImage = (v?: string | null) => (v && /^https?:\/\//.test(v) ? v : "");

const num = (v: string) => {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const shell =
  "max-h-[85vh] w-[calc(100vw-24px)] max-w-[440px] overflow-y-auto rounded-2xl p-5 sm:rounded-2xl";

export function EditButton({
  kind,
  id,
  values,
  className = "",
}: {
  kind: EditKind;
  id: string;
  values: EditValues;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(values);
  const refresh = useRefreshCatalog();

  useEffect(() => {
    if (open) setForm(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: keyof EditValues) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const name = (form.name ?? "").trim();
      if (!name && kind !== "product") throw new Error("Vui lòng nhập tên.");
      const image = (form.imageUrl ?? "").trim() || null;

      if (kind === "product") {
        await saveRow("products", id, {
          name: name.slice(0, 160) || "Sản phẩm",

          description: (form.description ?? "").trim().slice(0, 2000) || null,
          image_url: image,
          video_url: (form.videoUrl ?? "").trim() || null,
          detail_url: (form.detailUrl ?? "").trim() || null,
          price: num(String(form.price ?? 0)),
          sale_price: String(form.salePrice ?? "").trim()
            ? num(String(form.salePrice))
            : null,
        });
        const dealer = String(form.dealerPrice ?? "").trim();
        await saveDealerPrice(id, dealer ? num(dealer) : null);
        return;
      }

      const base: Record<string, unknown> = { name: name.slice(0, 120), image_url: image };
      if (kind !== "node") base['slug'] = toSlug(name).slice(0, 80);
      if (kind === "category") {
        base['icon'] = (form.icon ?? "car").trim().slice(0, 40) || "car";
        base['layout'] = form.layout ?? "classic";
      }
      if (kind === "model") base['years'] = (form.years ?? "").trim().slice(0, 40) || "—";

      await saveRow(TABLE[kind], id, base);
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Đã cập nhật.");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được."),
  });

  return (
    <>
      <button
        type="button"
        aria-label={`Sửa ${values.name}`}
        className={`flex size-7 items-center justify-center rounded-md border border-border bg-card text-gold ${className}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Pencil className="size-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={shell}>
          <DialogHeader>
            <DialogTitle>Sửa {LABEL[kind]}</DialogTitle>
            <DialogDescription>Cập nhật thông tin của “{values.name}”.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Field label="Tên">
              <Input
                value={form.name ?? ""}
                maxLength={160}
                onChange={(e) => set("name")(e.target.value)}
              />
            </Field>

            {kind === "category" ? (
              <Field label="Icon (car, speaker, camera, lightbulb...)">
                <Input
                  value={form.icon ?? ""}
                  maxLength={40}
                  onChange={(e) => set("icon")(e.target.value)}
                />
              </Field>
            ) : null}

            {kind === "model" ? (
              <Field label="Năm sản xuất">
                <Input
                  value={form.years ?? ""}
                  maxLength={40}
                  onChange={(e) => set("years")(e.target.value)}
                  placeholder="2014-2021"
                />
              </Field>
            ) : null}

            {kind === "product" ? (
              <Field label="Chú thích chi tiết">
                <Textarea
                  value={form.description ?? ""}
                  maxLength={2000}
                  rows={3}
                  onChange={(e) => set("description")(e.target.value)}
                />
              </Field>
            ) : null}

            <Field label="Link ảnh (tuỳ chọn)">
              <Input
                value={form.imageUrl ?? ""}
                maxLength={600}
                onChange={(e) => set("imageUrl")(e.target.value)}
                placeholder="https://res.cloudinary.com/..."
              />
              <ImageUrlPreview url={form.imageUrl} />
            </Field>


            {kind === "product" ? (
              <>
                <Field label="Link video (YouTube, TikTok, Facebook hoặc mã nhúng)">
                  <Input
                    value={form.videoUrl ?? ""}
                    maxLength={600}
                    placeholder="Dán link YouTube bình thường cũng được"
                    onChange={(e) => set("videoUrl")(e.target.value)}
                  />
                </Field>
                <Field label="Link ảnh/video chi tiết lắp lên xe">
                  <Input
                    value={form.detailUrl ?? ""}
                    maxLength={600}
                    placeholder="https://..."
                    onChange={(e) => set("detailUrl")(e.target.value)}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Giá niêm yết">
                    <Input
                      value={String(form.price ?? "")}
                      inputMode="numeric"
                      maxLength={12}
                      onChange={(e) => set("price")(e.target.value)}
                    />
                  </Field>
                  <Field label="Giá khuyến mãi">
                    <Input
                      value={String(form.salePrice ?? "")}
                      inputMode="numeric"
                      maxLength={12}
                      placeholder="Để trống nếu không KM"
                      onChange={(e) => set("salePrice")(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Giá nhập (cần quyền mới xem được)">
                  <Input
                    value={String(form.dealerPrice ?? "")}
                    inputMode="numeric"
                    maxLength={12}
                    onChange={(e) => set("dealerPrice")(e.target.value)}
                  />
                </Field>
              </>
            ) : null}

            {kind === "category" ? (
              <Field label="Kiểu cấu trúc">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={(form.layout ?? "classic") === "classic" ? "default" : "outline"}
                    className="h-auto whitespace-normal py-2 text-xs"
                    onClick={() => setForm((f) => ({ ...f, layout: "classic" }))}
                  >
                    Cổ điển
                  </Button>
                  <Button
                    type="button"
                    variant={form.layout === "tree" ? "default" : "outline"}
                    className="h-auto whitespace-normal py-2 text-xs"
                    onClick={() => setForm((f) => ({ ...f, layout: "tree" }))}
                  >
                    Cây linh hoạt
                  </Button>
                </div>
              </Field>
            ) : null}

            <Button className="h-11 w-full" disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
