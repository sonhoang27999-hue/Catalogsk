/** Đọc khả năng WebGL một lần mỗi phiên; context tạm được giải phóng ngay sau khi đọc. */
let cache: { ok: boolean; maxTex: number } | null = null;

function probe(): { ok: boolean; maxTex: number } {
  if (cache) return cache;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return (cache = { ok: false, maxTex: 4096 });
    const maxTex = (gl.getParameter(gl.MAX_TEXTURE_SIZE) as number) || 4096;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return (cache = { ok: true, maxTex });
  } catch {
    return (cache = { ok: false, maxTex: 4096 });
  }
}

export const hasWebGL = () => probe().ok;
export const maxTextureSize = () => probe().maxTex;
