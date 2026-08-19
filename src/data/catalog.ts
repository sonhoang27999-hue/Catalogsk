/**
 * Kiểu dữ liệu của catalog (4 tầng) + tiện ích chung.
 *
 * Dữ liệu THẬT nằm trên Lovable Cloud (bảng categories / series / models / products / videos)
 * và được nạp qua `src/data/catalog.api.ts`. Admin quản lý nội dung tại /admin.
 */
import { IMG, type ImageKey } from "./images";

export type Spec = { label: string; value: string };

export type Variant = { name: string; price: number; highlight: string };

export type Product = {
  id: string;
  /** UUID trong cơ sở dữ liệu (dùng cho thao tác quản trị). */
  dbId: string;
  name: string;
  formCode: string;
  image: string;
  /** Giá niêm yết */
  price: number;
  /** Giá đang khuyến mãi (nếu có) */
  salePrice?: number | null;
  dealerPrice?: number | null;
  priceNote?: string | null;
  installPrice?: number | null;
  description?: string | null;
  brand: string;
  origin: string;
  videoUrl?: string | null;
  /** Link website xem chi tiết sản phẩm lắp lên xe */
  detailUrl?: string | null;
  specs: Spec[];
  variants: Variant[];
};

export type Video = { id: string; title: string; url: string };

export type Model = {
  id: string;
  dbId: string;
  name: string;
  years: string;
  image: string;
  products: Product[];
  videos: Video[];
};

/**
 * Mục trong "Cấu trúc cây linh hoạt": mỗi mục vừa có mục con, vừa có sản phẩm riêng.
 */
export type CatalogNode = {
  id: string; // uuid
  name: string;
  image: string;
  children: CatalogNode[];
  products: Product[];
};

export type CategoryLayout = "classic" | "tree";

export type Series = { id: string; dbId: string; name: string; image: string; models: Model[] };

export type Category = {
  id: string;
  dbId: string;
  name: string;
  icon: string; // lucide icon key, xem src/components/CategoryIcon.tsx
  image: string;
  series: Series[];
  /** classic = Hãng > Đời xe > Sản phẩm; tree = cây nhiều tầng, mỗi tầng có sản phẩm riêng. */
  layout: CategoryLayout;
  /** Các mục gốc khi layout = "tree". */
  nodes: CatalogNode[];
  /** Sản phẩm gắn thẳng vào tầng gốc của hãng (layout = "tree"). */
  rootProducts: Product[];
};

/**
 * Ưu tiên link ảnh do admin nhập (Cloudinary...), nếu trống thì dùng ảnh có sẵn trong app.
 */
/**
 * Chuyển một số link chia sẻ phổ biến thành link ảnh trực tiếp để thẻ <img> hiển thị được.
 * Hỗ trợ: Google Drive, Dropbox, GitHub (blob). Link khác giữ nguyên.
 */
export const normalizeImageUrl = (raw: string): string => {
  const url = raw.trim();
  const drive =
    url.match(/drive\.google\.com\/file\/d\/([^/?]+)/)?.[1] ??
    (url.includes("drive.google.com") ? /[?&]id=([^&]+)/.exec(url)?.[1] : undefined);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive}&sz=w1600`;
  if (/dropbox\.com/.test(url)) return url.replace(/[?&]dl=0/, "").concat(url.includes("?") ? "&raw=1" : "?raw=1");
  if (/github\.com\/.+\/blob\//.test(url))
    return url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
  return url;
};

export const resolveImage = (url?: string | null, key?: string | null): string => {
  if (url && url.trim()) return normalizeImageUrl(url);
  if (key && key in IMG) return IMG[key as ImageKey];
  return IMG.car;
};

/** Thông tin liên hệ / báo giá. */
export const CONTACT = {
  shopName: "AutoDeco Studio",
  hotline: "0909 123 456",
  zalo: "0909123456",
  address: "128 Nguyễn Văn Linh, Quận 7, TP.HCM",
  workingHours: "08:00 - 19:00, T2 - CN",
};
