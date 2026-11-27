/**
 * Prepares a photo for upload.
 *
 * Phone cameras produce 8–50 megapixel files of 3–12 MB. Those are slow on
 * mobile data, can exceed a serverless host's request-body limit, and can be
 * rejected by the server's pixel guard. Handwriting stays fully legible at
 * 2000 px on the long edge, so photos are downscaled and re-encoded as JPEG
 * in the browser before they are sent.
 */
export const MAX_EDGE = 2000;
export const JPEG_QUALITY = 0.86;
/** Below this size a JPEG that already fits is sent untouched. */
export const SMALL_ENOUGH_BYTES = 1_500_000;

export type Size = { width: number; height: number };

/** Largest size with the same aspect ratio whose long edge is at most `maxEdge`. */
export function fitWithin(size: Size, maxEdge: number = MAX_EDGE): Size {
  const { width, height } = size;
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** True when the file must be redrawn: too many pixels, too many bytes, or not a JPEG. */
export function needsReencode(file: { type: string; size: number }, size: Size): boolean {
  if (file.type !== "image/jpeg") return true;
  if (file.size > SMALL_ENOUGH_BYTES) return true;
  return Math.max(size.width, size.height) > MAX_EDGE;
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
}

/**
 * Returns an upload-ready JPEG. If the browser cannot decode the file, the
 * original is returned and the server makes the decision, so this step can
 * only ever help.
 */
export async function prepareImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    const source = { width: bitmap.width, height: bitmap.height };
    if (!needsReencode(file, source)) return file;
    const target = fitWithin(source);
    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    // White underlay so transparent PNG scans do not turn black as JPEG.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, target.width, target.height);
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    const blob = await toBlob(canvas);
    if (!blob || blob.size === 0) return file;
    if (file.type === "image/jpeg" && blob.size >= file.size && target.width === source.width) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}
