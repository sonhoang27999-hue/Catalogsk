/** Explicit policy, not guessed Wi-Fi/cellular detection (unavailable on iOS). */
export const allowVoiceDownload = (dataSaver: boolean, automatic: boolean) => !dataSaver || !automatic;

export async function compressPhoto(file: File, dataSaver: boolean): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Không đọc được ảnh"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Thiết bị không xử lý được ảnh");
    let edge = 1280;
    for (;;) {
      const ratio = Math.min(1, edge / Math.max(img.width, img.height));
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", dataSaver ? 0.65 : 0.8);
      // Limit the actual base64 upload, not just the JPEG binary size.
      if (!dataSaver || image.length <= 350_000 || edge <= 640) return image;
      edge = Math.round(edge * 0.8);
    }
  } finally { URL.revokeObjectURL(url); }
}