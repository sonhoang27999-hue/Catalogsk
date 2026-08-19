/**
 * Kho ảnh của catalog.
 *
 * MUỐN THAY ẢNH? Chỉ cần sửa đúng file này (xem docs/HUONG-DAN-THAY-ANH.md).
 * - Ảnh local: bỏ file vào `src/assets/products/` rồi import ở đây.
 * - Ảnh CDN (Cloudinary, Supabase Storage...): thay giá trị bằng chuỗi URL https.
 *   Ví dụ: export const IMG_STARLIGHT = "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/star.jpg";
 */
import ambientTrim from "@/assets/products/ambient-trim.jpg";
import camera360 from "@/assets/products/camera360.jpg";
import carShowroom from "@/assets/products/car.jpg";
import interior from "@/assets/products/interior.jpg";
import soundproof from "@/assets/products/soundproof.jpg";
import starlight from "@/assets/products/starlight.jpg";
import tweeter from "@/assets/products/tweeter.jpg";

export const IMG = {
  starlight,
  tweeter,
  ambientTrim,
  camera360,
  soundproof,
  interior,
  car: carShowroom,
} as const;

export type ImageKey = keyof typeof IMG;
