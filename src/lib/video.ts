/**
 * Chuẩn hoá link video do admin dán vào thành link nhúng (embed) hợp lệ cho iframe.
 * Hỗ trợ: mã nhúng <iframe ...>, YouTube (watch/shorts/youtu.be/live), Vimeo,
 * Facebook, TikTok, Google Drive. Link khác giữ nguyên.
 */
export function toEmbedUrl(input?: string | null): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;

  // Admin dán nguyên mã nhúng <iframe src="..."></iframe>
  const iframeSrc = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeSrc?.[1]) return toEmbedUrl(iframeSrc[1]);

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return raw;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname;

  // YouTube
  if (host === "youtu.be") {
    const id = path.split("/").filter(Boolean)[0];
    return id ? `https://www.youtube.com/embed/${id}` : raw;
  }
  if (host.endsWith("youtube.com") || host === "youtube-nocookie.com") {
    if (path.startsWith("/embed/")) return url.toString();
    const v = url.searchParams.get("v");
    if (v) return `https://www.youtube.com/embed/${v}`;
    const m = path.match(/^\/(shorts|live|v)\/([^/]+)/);
    if (m?.[2]) return `https://www.youtube.com/embed/${m[2]}`;
    return raw;
  }

  // Vimeo
  if (host.endsWith("vimeo.com")) {
    if (host.startsWith("player.")) return url.toString();
    const id = path.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : raw;
  }

  // Google Drive
  if (host === "drive.google.com") {
    const id = path.match(/\/file\/d\/([^/]+)/)?.[1];
    return id ? `https://drive.google.com/file/d/${id}/preview` : raw;
  }

  // Facebook
  if (host.endsWith("facebook.com") || host === "fb.watch") {
    if (path.startsWith("/plugins/")) return url.toString();
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      url.toString(),
    )}&show_text=false`;
  }

  // TikTok
  if (host.endsWith("tiktok.com")) {
    if (path.startsWith("/player/")) return url.toString();
    const id = path.match(/\/video\/(\d+)/)?.[1];
    return id ? `https://www.tiktok.com/player/v1/${id}` : raw;
  }

  return url.toString();
}
