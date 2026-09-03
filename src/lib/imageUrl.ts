/**
 * Tầng trừu tượng cho ẢNH (image resolver).
 *
 * Mục tiêu: UI chỉ nói "tôi cần ảnh cỡ thumb / preview / detail / original",
 * còn việc link nguồn có hỗ trợ resize hay không thì xử lý ở đây. Sau này chuyển
 * sang CDN/Storage khác chỉ cần sửa file này, không phải sửa giao diện.
 *
 * Nguyên tắc:
 * - CHẤT LƯỢNG LÀ ƯU TIÊN: chỉ giảm KÍCH THƯỚC, không ép nén thấp; ảnh gốc luôn
 *   giữ nguyên và là nguồn chuẩn.
 * - Chỉ đổi kích thước với những nguồn CHẮC CHẮN hỗ trợ (Google Drive thumbnail,
 *   Cloudinary, Supabase Storage render, ImageKit, weserv). Nguồn khác giữ nguyên
 *   URL gốc (lazy-load, chỉ tải nơi thật sự cần) — không bịa tham số làm hỏng link.
 * - Luôn trả kèm link gốc làm dự phòng, để ảnh vẫn hiện nếu biến thể resize lỗi.
 */

export type ImageSize = "thumb" | "preview" | "detail" | "original";

/**
 * Chiều rộng mục tiêu (px, ở DPR = 1):
 * - thumb: card/lưới danh sách
 * - preview: ảnh lớn trong thẻ / gallery
 * - detail: ảnh chính trang chi tiết, lightbox
 * - original: URL gốc, chỉ khi user bấm "xem ảnh gốc"/zoom sâu
 */
export const IMAGE_WIDTHS: Record<Exclude<ImageSize, "original">, number> = {
  thumb: 600,
  preview: 1600,
  detail: 2600,
};

/** Tương thích ngược với tên cũ. */
export const LEGACY_FULL: ImageSize = "detail";

/**
 * Chiều rộng mục tiêu — CỐ ĐỊNH (không phụ thuộc devicePixelRatio).
 * Lý do: URL phải giống hệt nhau giữa server-render và trình duyệt để không
 * hydration-mismatch / tải ảnh 2 lần. Màn retina được phục vụ bản 2x qua
 * `srcSet` (xem imageSrcSet) — trình duyệt tự chọn, chất lượng không đổi.
 */
const targetWidth = (size: ImageSize): number | null => {
  if (size === "original") return null;
  return IMAGE_WIDTHS[size];
};

/**
 * Chuyển một số link chia sẻ phổ biến thành link ảnh trực tiếp để thẻ <img> hiển thị được.
 * Hỗ trợ: Google Drive, Dropbox, GitHub (blob), Imgur, và link thiếu "https://".
 */
export const normalizeImageUrl = (raw: string): string => {
  // bỏ khoảng trắng, dấu nháy, ký tự xuống dòng khi copy/paste
  let url = raw
    .trim()
    .replace(/^["'<]+|["'>]+$/g, "")
    .replace(/\s+/g, "");
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

const driveIdOf = (url: string): string | null =>
  /drive\.google\.com\/thumbnail\?id=([^&]+)/.exec(url)?.[1] ??
  /\/file\/d\/([^/?#]+)/.exec(url)?.[1] ??
  /lh3\.googleusercontent\.com\/d\/([^=/?#]+)/.exec(url)?.[1] ??
  /[?&]id=([^&#]+)/.exec(url)?.[1] ??
  null;

/** Tạo URL đã resize về chiều rộng `w` nếu nguồn hỗ trợ; ngược lại trả null. */
const resizeTo = (url: string, w: number): string | null => {
  // Google Drive: endpoint thumbnail nhận tham số sz=w<width>
  const driveId = driveIdOf(url);
  if (driveId) return `https://drive.google.com/thumbnail?id=${driveId}&sz=w${w}`;

  // Cloudinary: chèn transformation, q_auto:good giữ chất lượng cao
  if (/res\.cloudinary\.com\/.+\/upload\//.test(url)) {
    return url.replace(/\/upload\/(?!f_auto)/, `/upload/f_auto,q_auto:good,w_${w},c_limit/`);
  }

  // Supabase Storage: dùng endpoint render/image để resize (quality cao, không phóng to)
  if (/\/storage\/v1\/object\/public\//.test(url)) {
    const rendered = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
    return `${rendered}${rendered.includes("?") ? "&" : "?"}width=${w}&resize=contain&quality=90`;
  }
  if (/\/storage\/v1\/render\/image\/public\//.test(url)) {
    return `${url}${url.includes("?") ? "&" : "?"}width=${w}&resize=contain&quality=90`;
  }

  // ImageKit / weserv: hỗ trợ tham số chiều rộng
  if (/ik\.imagekit\.io\//.test(url)) return `${url}${url.includes("?") ? "&" : "?"}tr=w-${w}`;
  if (/images\.weserv\.nl\//.test(url)) return `${url}${url.includes("?") ? "&" : "?"}w=${w}&q=90`;

  return null;
};

/**
 * Áp kích thước mong muốn nếu NGUỒN hỗ trợ; nếu không thì trả về chính URL đã chuẩn hoá.
 */
export const imageUrl = (raw: string | null | undefined, size: ImageSize = "preview"): string => {
  const url = normalizeImageUrl(raw ?? "");
  if (!url) return "";
  const w = targetWidth(size);

  // Ảnh bundle nội bộ (đã được Vite tối ưu), data URI, hoặc yêu cầu ảnh gốc → giữ nguyên
  if (!w || url.startsWith("/") || url.startsWith("data:")) return url;

  // Nguồn không hỗ trợ resize (Dropbox, GitHub raw, Imgur, host tự do...) → dùng ảnh gốc
  return resizeTo(url, w) ?? url;
};

/**
 * `srcset` 1x/2x cho nguồn hỗ trợ resize: trình duyệt tự chọn bản 2x trên màn
 * retina → ảnh sắc nét như trước, còn máy thường chỉ tải bản nhẹ hơn.
 * Trả undefined với nguồn không resize được (giữ nguyên hành vi cũ).
 */
export const imageSrcSet = (
  raw: string | null | undefined,
  size: ImageSize = "preview",
): string | undefined => {
  // detail đã đủ lớn (2600px) — không nhân đôi để tránh phóng to quá ảnh gốc.
  if (size === "original" || size === "detail") return undefined;
  const url = normalizeImageUrl(raw ?? "");
  if (!url || url.startsWith("/") || url.startsWith("data:")) return undefined;
  const w = targetWidth(size);
  if (!w) return undefined;
  const x1 = resizeTo(url, w);
  const x2 = resizeTo(url, w * 2);
  if (!x1 || !x2) return undefined;
  return `${x1} ${w}w, ${x2} ${w * 2}w`;
};

/** Nguồn ảnh này có tạo được biến thể nhỏ hơn không (dùng để quyết định có nên tải "ảnh gốc" riêng). */
export const supportsResize = (raw: string | null | undefined): boolean => {
  const url = normalizeImageUrl(raw ?? "");
  if (!url || url.startsWith("/") || url.startsWith("data:")) return false;
  return (
    Boolean(driveIdOf(url)) ||
    /res\.cloudinary\.com\/.+\/upload\//.test(url) ||
    /\/storage\/v1\/(object|render\/image)\/public\//.test(url) ||
    /ik\.imagekit\.io\//.test(url) ||
    /images\.weserv\.nl\//.test(url)
  );
};

/**
 * Proxy ảnh công cộng (images.weserv.nl): tải CÙNG ảnh gốc qua CDN trung gian
 * đáng tin cậy. Dùng làm dự phòng khi host gốc chặn hotlink / chặn theo IP /
 * mạng chập chờn — nhờ đó khách vãng lai vẫn thấy ĐÚNG ảnh admin đã chọn,
 * không bao giờ rơi về ảnh mặc định chỉ vì host bên thứ ba khó tính.
 */
const weservProxy = (url: string, size: ImageSize): string | null => {
  if (!/^https?:\/\//i.test(url)) return null;
  // Đã là proxy/nguồn nội bộ ổn định thì không cần bọc thêm.
  if (/images\.weserv\.nl|wsrv\.nl/.test(url)) return null;
  if (/\/storage\/v1\/(object|render\/image)\/public\//.test(url)) return null;
  const w = targetWidth(size);
  const base = `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
  return w ? `${base}&w=${w}&q=90` : base;
};

/**
 * Danh sách link dự phòng cho cùng một ảnh: nếu link đầu lỗi (bị chặn hotlink,
 * Google Drive đổi endpoint...) thì thử tiếp link sau.
 */
export const imageCandidates = (raw: string, size: ImageSize = "preview"): string[] => {
  const first = imageUrl(raw, size);
  if (!first) return [];
  const out = [first];

  const original = normalizeImageUrl(raw);
  const driveId = driveIdOf(original);
  if (driveId) {
    out.push(
      `https://lh3.googleusercontent.com/d/${driveId}${size === "original" ? "" : `=w${targetWidth(size)}`}`,
      `https://drive.google.com/uc?export=view&id=${driveId}`,
      `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`,
    );
  }

  // Dropbox: thử cả endpoint dl.dropboxusercontent.com
  if (/dropbox\.com/.test(original)) {
    out.push(
      original.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace(/[?&]raw=1/, ""),
    );
  }

  // Dự phòng qua proxy CDN: cùng ảnh gốc, đường truyền khác (chống hotlink-block).
  const proxied = weservProxy(original, size);
  if (proxied) out.push(proxied);

  // Luôn giữ link gốc làm chốt chặn cuối (phòng khi biến thể resize lỗi)
  out.push(original);

  return [...new Set(out.filter(Boolean))];
};
