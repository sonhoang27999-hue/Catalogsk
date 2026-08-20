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
 * Hỗ trợ: Google Drive, Dropbox, GitHub (blob), Imgur, và link thiếu "https://".
 */
export const normalizeImageUrl = (raw: string): string => {
  // bỏ khoảng trắng, dấu nháy, ký tự xuống dòng khi copy/paste
  let url = raw.trim().replace(/^["'<]+|["'>]+$/g, "").replace(/\s+/g, "");
  if (!url) return url;
  if (url.startsWith("//")) url = `https:${url}`;
  // link dán thiếu giao thức (vd: drive.google.com/...), bỏ qua đường dẫn nội bộ /assets
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/") && !url.startsWith("data:")) {
    url = `https://${url}`;
  }

  // Google Drive → link ảnh trực tiếp
  if (/drive\.google\.com|docs\.google\.com/.test(url)) {
    const id =
      /\/file\/d\/([^/?#]+)/.exec(url)?.[1] ??
      /[?&]id=([^&#]+)/.exec(url)?.[1] ??
      /\/d\/([^/?#]+)/.exec(url)?.[1];
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;
  }

  // Dropbox → raw
  if (/dropbox\.com/.test(url)) {
    const clean = url.replace(/[?&]dl=[01]/g, "").replace(/[?&]raw=1/g, "");
    return clean + (clean.includes("?") ? "&raw=1" : "?raw=1");
  }

  // GitHub blob → raw
  if (/github\.com\/.+\/blob\//.test(url))
    return url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");

  // Imgur trang xem → ảnh trực tiếp
  const imgur = /^https?:\/\/(?:www\.)?imgur\.com\/(?:gallery\/|a\/)?([A-Za-z0-9]+)$/.exec(url);
  if (imgur) return `https://i.imgur.com/${imgur[1]}.jpg`;

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
