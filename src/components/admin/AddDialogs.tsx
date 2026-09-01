/**
 * Các modal "thêm nhanh" hiển thị ngay trên giao diện catalog cho tài khoản admin.
 * Mỗi modal tự gắn khoá ngoại của tầng cha đang xem (category_id / series_id / model_id).
 */
import { useState } from "react";
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
import {
  ensureDefaultModel,
  insertNode,
  insertProduct,
  insertVideo,
  saveDealerPrice,
  saveRow,
  toSlug,
} from "@/data/admin.api";
import { toEmbedUrl } from "@/lib/video";
import { useRefreshCatalog } from "@/hooks/useRefreshCatalog";
import { Field } from "./AddTile";
import { ImageUrlPreview } from "./ImageUrlPreview";
import { VideoUrlPreview } from "./VideoUrlPreview";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

const useSaver = () => {
  const refresh = useRefreshCatalog();
  return (onDone: () => void) => ({
    onSuccess: async () => {
      await refresh();
      toast.success("Đã lưu.");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được."),
  });
};

const shell =
  "max-h-[85vh] w-[calc(100vw-24px)] max-w-[440px] overflow-y-auto rounded-2xl p-5 sm:rounded-2xl";

/* ------------------------------ Tầng 1: Hãng xe ------------------------------ */

export function AddCategoryDialog({ open, onOpenChange }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("car");
  const [imageUrl, setImageUrl] = useState("");
  const [layout, setLayout] = useState<"classic" | "tree">("classic");
  const handlers = useSaver();

  const reset = () => {
    setName("");
    setIcon("car");
    setImageUrl("");
    setLayout("classic");
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Vui lòng nhập tên hãng xe.");
      await saveRow("categories", null, {
        name: name.trim().slice(0, 120),
        slug: toSlug(name).slice(0, 80),
        icon: icon.trim().slice(0, 40) || "car",
        image_url: imageUrl.trim() || null,
        layout,
      });
    },
    ...handlers(() => {
      reset();
      onOpenChange(false);
    }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={shell}>
        <DialogHeader>
          <DialogTitle>Thêm hãng xe</DialogTitle>
          <DialogDescription>Tạo một hãng xe / nhóm phụ kiện mới ở trang chủ.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Tên hãng xe">
            <Input
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mercedes"
            />
          </Field>
          <Field label="Icon (car, speaker, camera, lightbulb...)">
            <Input value={icon} maxLength={40} onChange={(e) => setIcon(e.target.value)} />
          </Field>
          <Field label="Link icon / ảnh (tuỳ chọn)">
            <Input
              value={imageUrl}
              maxLength={600}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/..."
            />
          </Field>
          <Field label="Kiểu cấu trúc">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={layout === "classic" ? "default" : "outline"}
                className="h-auto whitespace-normal py-2 text-xs"
                onClick={() => setLayout("classic")}
              >
                Cổ điển
                <span className="block text-[10px] font-normal opacity-80">
                  Hãng › Đời xe › Sản phẩm
                </span>
              </Button>
              <Button
                type="button"
                variant={layout === "tree" ? "default" : "outline"}
                className="h-auto whitespace-normal py-2 text-xs"
                onClick={() => setLayout("tree")}
              >
                Cây linh hoạt
                <span className="block text-[10px] font-normal opacity-80">
                  Mỗi tầng vừa có mục con vừa có sản phẩm
                </span>
              </Button>
            </div>
          </Field>
          <Button className="h-11 w-full" onClick={() => save.mutate()} disabled={save.isPending}>
            Lưu hãng xe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Tầng 2: Đời xe ------------------------------ */

export function AddSeriesDialog({
  open,
  onOpenChange,
  categoryDbId,
  categoryName,
}: Props & { categoryDbId: string; categoryName: string }) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const handlers = useSaver();

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Vui lòng nhập tên đời xe.");
      await saveRow("series", null, {
        category_id: categoryDbId,
        name: name.trim().slice(0, 120),
        slug: toSlug(name).slice(0, 80),
        image_url: imageUrl.trim() || null,
      });
    },
    ...handlers(() => {
      setName("");
      setImageUrl("");
      onOpenChange(false);
    }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={shell}>
        <DialogHeader>
          <DialogTitle>Thêm đời xe</DialogTitle>
          <DialogDescription>Đời xe mới sẽ thuộc hãng {categoryName}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Tên đời xe">
            <Input
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="C-Class"
            />
          </Field>
          <Field label="Link ảnh (tuỳ chọn)">
            <>
              <Input
                value={imageUrl}
                maxLength={600}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <ImageUrlPreview url={imageUrl} />
            </>
          </Field>
          <Button className="h-11 w-full" onClick={() => save.mutate()} disabled={save.isPending}>
            Lưu đời xe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Tầng 3: Năm sản xuất ------------------------------- */

export function AddModelDialog({
  open,
  onOpenChange,
  seriesDbId,
  seriesName,
}: Props & { seriesDbId: string; seriesName: string }) {
  const [name, setName] = useState("");
  const [years, setYears] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const handlers = useSaver();

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Vui lòng nhập năm sản xuất / mã khung.");
      await saveRow("models", null, {
        series_id: seriesDbId,
        name: name.trim().slice(0, 120),
        slug: toSlug(name).slice(0, 80),
        years: years.trim().slice(0, 40) || "—",
        image_url: imageUrl.trim() || null,
      });
    },
    ...handlers(() => {
      setName("");
      setYears("");
      setImageUrl("");
      onOpenChange(false);
    }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={shell}>
        <DialogHeader>
          <DialogTitle>Thêm năm sản xuất</DialogTitle>
          <DialogDescription>Năm sản xuất mới sẽ thuộc đời xe {seriesName}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Năm sản xuất / mã khung">
            <Input
              value={name}
              maxLength={120}
              onChange={(e) => setName(e.target.value)}
              placeholder="W205"
            />
          </Field>
          <Field label="Năm sản xuất">
            <Input
              value={years}
              maxLength={40}
              onChange={(e) => setYears(e.target.value)}
              placeholder="2014-2021"
            />
          </Field>
          <Field label="Link ảnh (tuỳ chọn)">
            <>
              <Input
                value={imageUrl}
                maxLength={600}
                onChange={(e) => setImageUrl(e.target.value)}
              />
              <ImageUrlPreview url={imageUrl} />
            </>
          </Field>
          <Button className="h-11 w-full" onClick={() => save.mutate()} disabled={save.isPending}>
            Lưu năm sản xuất
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Tầng 4: Sản phẩm ----------------------------- */

const emptyProduct = {
  name: "",
  description: "",
  imageUrl: "",
  videoUrl: "",
  detailUrl: "",
  dealerPrice: "",
  price: "",
  salePrice: "",
};

const num = (v: string) => {
  const n = Number(v.replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function AddProductDialog({
  open,
  onOpenChange,
  modelDbId,
  modelName,
  nodeDbId,
  categoryDbId,
  seriesDbId,
}: Props & {
  /** Gắn sản phẩm vào "năm sản xuất" (cấu trúc cổ điển). */
  modelDbId?: string | undefined;
  modelName: string;
  /** Gắn sản phẩm vào một mục của cấu trúc cây linh hoạt. */
  nodeDbId?: string | undefined;
  /** Gắn sản phẩm thẳng vào tầng gốc của hãng (cấu trúc cây linh hoạt). */
  categoryDbId?: string | undefined;
  /** Nếu đời xe chưa có "năm sản xuất" nào, tự tạo một mục mặc định. */
  seriesDbId?: string | undefined;
}) {
  const [form, setForm] = useState(emptyProduct);
  const refresh = useRefreshCatalog();

  const save = useMutation({
    mutationFn: async (vars: { keepOpen: boolean }) => {
      let target: Record<string, string> = {};
      if (nodeDbId) {
        target = { node_id: nodeDbId };
      } else if (categoryDbId) {
        target = { category_id: categoryDbId };
      } else if (modelDbId) {
        target = { model_id: modelDbId };
      } else if (seriesDbId) {
        target = { model_id: await ensureDefaultModel(seriesDbId, modelName) };
      } else {
        throw new Error("Thiếu ngữ cảnh để lưu sản phẩm.");
      }
      const productId = await insertProduct({
        ...target,
        name: form.name.trim().slice(0, 160) || "Sản phẩm",
        description: form.description.trim().slice(0, 2000) || null,
        image_url: form.imageUrl.trim() || null,
        video_url: form.videoUrl.trim() || null,
        detail_url: form.detailUrl.trim() || null,
        price: num(form.price),
        sale_price: form.salePrice.trim() ? num(form.salePrice) : null,
        form_code: modelName.slice(0, 80),
      });
      if (form.dealerPrice.trim()) {
        await saveDealerPrice(productId, num(form.dealerPrice));
      }
      return vars.keepOpen;
    },
    onSuccess: async (keepOpen) => {
      await refresh();
      setForm(emptyProduct);
      if (keepOpen) {
        toast.success("Đã lưu. Nhập tiếp sản phẩm mới.");
      } else {
        toast.success("Đã lưu sản phẩm.");
        onOpenChange(false);
      }
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được."),
  });

  const set = (k: keyof typeof emptyProduct) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={shell}>
        <DialogHeader>
          <DialogTitle>Thêm sản phẩm</DialogTitle>
          <DialogDescription>Sản phẩm mới sẽ thuộc {modelName}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Tên sản phẩm (không bắt buộc)">
            <Input
              value={form.name}
              maxLength={160}
              onChange={(e) => set("name")(e.target.value)}
              placeholder="Đèn trần sao 5D"
            />
          </Field>
          <Field label="Chú thích chi tiết">
            <Textarea
              value={form.description}
              maxLength={2000}
              rows={3}
              onChange={(e) => set("description")(e.target.value)}
            />
          </Field>
          <Field label="Link ảnh (Image URL)">
            <Input
              value={form.imageUrl}
              maxLength={600}
              onChange={(e) => set("imageUrl")(e.target.value)}
              placeholder="https://res.cloudinary.com/..."
            />
            <ImageUrlPreview url={form.imageUrl} />
          </Field>
          <Field label="Link video TikTok / YouTube (hoặc mã nhúng)">
            <Input
              value={form.videoUrl}
              maxLength={600}
              onChange={(e) => set("videoUrl")(e.target.value)}
              placeholder="https://www.tiktok.com/... hoặc https://youtube.com/..."
            />
            <VideoUrlPreview url={form.videoUrl} />
          </Field>
          <Field label="Link ảnh/video chi tiết lắp lên xe">
            <Input
              value={form.detailUrl}
              maxLength={600}
              onChange={(e) => set("detailUrl")(e.target.value)}
              placeholder="https://..."
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Giá niêm yết">
              <Input
                value={form.price}
                inputMode="numeric"
                maxLength={12}
                onChange={(e) => set("price")(e.target.value)}
              />
            </Field>
            <Field label="Giá khuyến mãi">
              <Input
                value={form.salePrice}
                inputMode="numeric"
                maxLength={12}
                placeholder="Để trống nếu không KM"
                onChange={(e) => set("salePrice")(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Giá nhập (cần quyền mới xem được)">
            <Input
              value={form.dealerPrice}
              inputMode="numeric"
              maxLength={12}
              onChange={(e) => set("dealerPrice")(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              variant="outline"
              className="h-11"
              disabled={save.isPending}
              onClick={() => save.mutate({ keepOpen: true })}
            >
              Lưu & Thêm tiếp
            </Button>
            <Button
              className="h-11"
              disabled={save.isPending}
              onClick={() => save.mutate({ keepOpen: false })}
            >
              Lưu & Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------- Cấu trúc cây linh hoạt: thêm mục con -------------------- */

export function AddNodeDialog({
  open,
  onOpenChange,
  categoryDbId,
  parentNodeId,
  parentName,
  levelLabel,
}: Props & {
  categoryDbId: string;
  parentNodeId: string | null;
  parentName: string;
  levelLabel: string;
}) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const handlers = useSaver();

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Vui lòng nhập tên mục.");
      await insertNode({
        category_id: categoryDbId,
        parent_id: parentNodeId,
        name: name.trim().slice(0, 120),
        image_url: imageUrl.trim() || null,
      });
    },
    ...handlers(() => {
      setName("");
      setImageUrl("");
      onOpenChange(false);
    }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={shell}>
        <DialogHeader>
          <DialogTitle>Thêm {levelLabel}</DialogTitle>
          <DialogDescription>Mục mới sẽ nằm trong {parentName}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label={`Tên ${levelLabel.toLowerCase()}`}>
            <Input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Link ảnh (tuỳ chọn)">
            <Input
              value={imageUrl}
              maxLength={600}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://res.cloudinary.com/..."
            />
          </Field>
          <Button className="h-11 w-full" onClick={() => save.mutate()} disabled={save.isPending}>
            Lưu {levelLabel.toLowerCase()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------- Video riêng (không gắn sản phẩm) -------------------- */

export function AddVideoDialog({
  open,
  onOpenChange,
  modelDbId,
  seriesDbId,
  seriesName,
}: Props & {
  modelDbId?: string | undefined;
  seriesDbId?: string | undefined;
  seriesName: string;
}) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const handlers = useSaver();

  const save = useMutation({
    mutationFn: async () => {
      const embed = toEmbedUrl(url);
      if (!url.trim() || !embed) throw new Error("Hãy dán link video trước.");
      const targetModelId = modelDbId ?? (await ensureDefaultModel(seriesDbId!, seriesName));
      await insertVideo({
        model_id: targetModelId,
        title: title.trim() || "Video",
        url: embed,
      });
    },
    ...handlers(() => {
      setTitle("");
      setUrl("");
      onOpenChange(false);
    }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={shell}>
        <DialogHeader>
          <DialogTitle>Thêm video</DialogTitle>
          <DialogDescription>
            Video hiển thị trong mục "Video lắp đặt thực tế" của {seriesName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Tiêu đề video (tuỳ chọn)">
            <Input
              value={title}
              maxLength={160}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lắp đèn ambient thực tế..."
            />
          </Field>
          <Field label="Link video TikTok / YouTube (hoặc mã nhúng)">
            <Input
              value={url}
              maxLength={600}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.tiktok.com/... hoặc https://youtube.com/..."
            />
            <VideoUrlPreview url={url} />
          </Field>
          <Button
            className="h-11 w-full"
            onClick={() => save.mutate()}
            disabled={save.isPending || !url.trim()}
          >
            Lưu video
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
