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

