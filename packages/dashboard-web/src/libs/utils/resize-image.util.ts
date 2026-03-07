function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      mimeType,
      quality,
    );
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function resizeImage(
  file: File,
  maxBytes: number,
  maxDimension: number,
): Promise<{ base64: string; mimeType: string }> {
  const img = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(img.src);

  // Try original mime type first
  const originalMime =
    file.type === "image/png" || file.type === "image/webp"
      ? file.type
      : "image/jpeg";

  let blob = await canvasToBlob(canvas, originalMime);

  if (blob.size <= maxBytes) {
    const base64 = await blobToBase64(blob);
    return { base64, mimeType: originalMime };
  }

  // Re-encode as JPEG with decreasing quality until under limit
  for (let quality = 0.9; quality >= 0.1; quality -= 0.1) {
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
    if (blob.size <= maxBytes) {
      const base64 = await blobToBase64(blob);
      return { base64, mimeType: "image/jpeg" };
    }
  }

  // Last resort: lowest quality JPEG
  const base64 = await blobToBase64(blob);
  return { base64, mimeType: "image/jpeg" };
}
