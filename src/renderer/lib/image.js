export async function fileToDataUrl(
  file,
  { maxSize = 256, type = "image/jpeg", quality = 0.82 } = {}
) {
  if (!file) return null;
  if (!(file instanceof File)) throw new Error("Invalid file.");
  if (!String(file.type || "").startsWith("image/")) throw new Error("Please pick an image file.");

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read image."));
      el.src = objectUrl;
    });

    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (!w || !h) throw new Error("Invalid image.");

    const scale = Math.min(1, maxSize / Math.max(w, h));
    const tw = Math.max(1, Math.round(w * scale));
    const th = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported.");
    ctx.drawImage(img, 0, 0, tw, th);

    return canvas.toDataURL(type, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}


