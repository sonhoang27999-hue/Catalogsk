# Hướng dẫn thay ảnh sản phẩm

Toàn bộ ảnh của app được khai báo tập trung tại **`src/data/images.ts`**, và dữ liệu
(`src/data/catalog.ts`) chỉ tham chiếu tới các key trong đó. Nhờ vậy bạn thay ảnh
mà không phải sửa giao diện.

## Cách 1 — Dùng ảnh local (khuyến nghị cho ảnh cố định)

1. Copy file ảnh vào thư mục `src/assets/products/` (đặt tên không dấu, ví dụ `den-tran-sao.jpg`).
2. Mở `src/data/images.ts`, thêm/sửa dòng import:

```ts
import starlight from "@/assets/products/den-tran-sao.jpg";
```

3. Lưu lại. Ảnh sẽ tự động được Vite tối ưu (hash, cache vĩnh viễn).

Khuyến nghị: ảnh vuông ~1000×1000px cho sản phẩm, 1280×720px (16:9) cho banner,
định dạng `.jpg` (ảnh chụp) hoặc `.webp`. Giữ dung lượng < 400KB/ảnh.

## Cách 2 — Dùng ảnh CDN ngoài (Cloudinary, Supabase Storage, S3...)

Trong `src/data/images.ts`, thay import bằng một chuỗi URL:

```ts
export const IMG = {
  starlight: "https://res.cloudinary.com/<cloud-name>/image/upload/f_auto,q_auto,w_1000/den-tran-sao.jpg",
  // ...
} as const;
```

Mẹo Cloudinary: thêm `f_auto,q_auto` để tự chọn định dạng/nén, `w_1000` để giới hạn
chiều rộng. Không cần chỉnh CSS — app đã dùng `object-fit: contain` cho ảnh sản phẩm
và `cover` cho ảnh bìa, cùng `loading="lazy"`.

## Cách 3 — Thay ảnh cho từng sản phẩm cụ thể

Mở `src/data/catalog.ts`, mỗi sản phẩm có trường `image`:

```ts
{ id: "...", name: "Bộ đèn trần sao 3D", image: IMG.starlight, ... }
```

Đổi `IMG.starlight` thành key khác, hoặc gán trực tiếp URL:

```ts
image: "https://.../anh-that-cua-ban.jpg",
```

## Ảnh banner trang chủ

Nằm ở `src/assets/banner.jpg`, được import trong `src/routes/index.tsx`.
Thay bằng cách ghi đè file cùng tên (tỷ lệ 16:9).

## Khi chuyển sang Lovable Cloud (Supabase)

Cột `image` trong bảng `products` chỉ cần lưu URL ảnh (Supabase Storage public URL).
Hàm truy vấn trong `src/data/catalog.repository.ts` giữ nguyên chữ ký, nên UI không đổi.
