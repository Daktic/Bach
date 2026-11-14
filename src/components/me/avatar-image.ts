// Shrinks an uploaded photo to a small square JPEG so it fits in localStorage
// (a phone photo is several MB; this is ~20–40 KB). The crop maths is pure and
// unit-tested; downscaleAvatar() needs a browser (Image + canvas).

export const AVATAR_MAX_SIZE = 256;
export const AVATAR_JPEG_QUALITY = 0.85;
// JPEG has no transparency; fill with the card colour behind the avatar.
const BACKGROUND = "#fbf9e0";

export interface SquareCrop {
  /** Top-left of the centred square in the source image. */
  sx: number;
  sy: number;
  /** Side of that square in source pixels. */
  side: number;
  /** Side of the output, never upscaled. */
  size: number;
}

/** The centred square of a width×height image, scaled to at most `max` px. */
export function squareCrop(width: number, height: number, max = AVATAR_MAX_SIZE): SquareCrop {
  const side = Math.max(0, Math.floor(Math.min(width, height)));
  return {
    sx: Math.floor((width - side) / 2),
    sy: Math.floor((height - side) / 2),
    side,
    size: Math.min(max, side),
  };
}

/**
 * Intermediate sizes for halving `side` down towards `size`. A single big
 * drawImage reduction aliases badly in some browsers; halving keeps it smooth.
 *   downscaleSteps(3024, 256) → [1512, 756, 378]  (then 378 → 256)
 */
export function downscaleSteps(side: number, size: number): number[] {
  const steps: number[] = [];
  let current = side;
  while (size > 0 && Math.floor(current / 2) >= size) {
    current = Math.floor(current / 2);
    steps.push(current);
  }
  return steps;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

function canvasOf(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return [canvas, ctx];
}

/** Reads an image file, crops it to a centred square and returns a small JPEG data URL. */
export async function downscaleAvatar(
  file: Blob,
  max = AVATAR_MAX_SIZE,
  quality = AVATAR_JPEG_QUALITY,
): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const crop = squareCrop(img.naturalWidth, img.naturalHeight, max);
    if (crop.size < 1) throw new Error("Empty image");

    let source: CanvasImageSource = img;
    let sx = crop.sx;
    let sy = crop.sy;
    let side = crop.side;
    for (const step of downscaleSteps(crop.side, crop.size)) {
      const [canvas, ctx] = canvasOf(step);
      ctx.drawImage(source, sx, sy, side, side, 0, 0, step, step);
      source = canvas;
      sx = 0;
      sy = 0;
      side = step;
    }

    const [out, ctx] = canvasOf(crop.size);
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, crop.size, crop.size);
    ctx.drawImage(source, sx, sy, side, side, 0, 0, crop.size, crop.size);
    return out.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
