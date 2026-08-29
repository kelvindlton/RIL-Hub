// Browser-only image helpers (createImageBitmap + <canvas>). Import from
// 'use client' components only — there is no server equivalent of either API.

// 512px is deliberate headroom: the largest avatar the app renders is the 2xl
// profile hero at 96px CSS, so 512 covers a 4x-DPR screen and any future use
// without storing phone-camera-sized files.
const MAX_DIMENSION = 512;

// WebP at 0.85 puts a typical portrait around 20-60KB, far under the bucket's
// 2MB limit. WebP also preserves alpha: encoding to JPEG would require filling
// the canvas white first, or a transparent PNG gains a black background.
const OUTPUT_TYPE = 'image/webp';
const OUTPUT_QUALITY = 0.85;

// The crop is an INTERMEDIATE — downscaleImage re-encodes it at 512px/0.85 — so
// this is deliberately near-lossless. Any generation loss here would compound
// with the final encode for no benefit.
const CROP_QUALITY = 0.95;

const FAILURE_MESSAGE = 'That image could not be processed. Please try a different file.';

// The bucket accepts only these three (no SVG — see 20260829000000_avatar_storage).
// `accept` on a file input is a hint the member can bypass, so this is re-checked
// in code. Lives here rather than in a modal because both the Edit Profile form
// and the avatar viewer pick files now.
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// Checked on the RAW file, before decoding, so a 50MB image never gets expanded
// into memory. The downscaled result is ~20-60KB, so this rejects no legitimate
// photo; the bucket's 2MB file_size_limit is the server-side backstop.
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

/** Returns a member-facing message, or null when the file is acceptable. */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Please choose a PNG, JPEG or WebP image.';
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return 'That image is too large to process. Please choose one under 10 MB.';
  }
  return null;
}

// Structurally identical to react-easy-crop's `Area`, declared locally so this
// module stays independent of the cropper library.
export type CropRect = { x: number; y: number; width: number; height: number };

/**
 * Shrinks `source` to fit within MAX_DIMENSION (aspect ratio preserved, no crop —
 * Avatar applies `object-cover rounded-full`, so the CSS centre-crops) and
 * re-encodes it as WebP.
 *
 * Takes a Blob rather than a File so cropImage()'s output feeds straight in.
 *
 * Decoding here is also the only real CONTENT check in the pipeline: the bucket's
 * allowed_mime_types validates the client-asserted Content-Type, not the bytes,
 * whereas createImageBitmap throws on anything that isn't a decodable image — so
 * a renamed executable never reaches the network.
 */
export async function downscaleImage(source: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new Error(FAILURE_MESSAGE);
  }

  try {
    // Capped at 1: never upscale a small image, that only adds bytes.
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error(FAILURE_MESSAGE);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY)
    );

    // toBlob yields null when the browser can't encode the requested type
    // (Safari before 14, for WebP). Surfacing it keeps the caller's "nothing was
    // saved" path honest instead of silently uploading a PNG labelled as WebP.
    if (!blob) throw new Error(FAILURE_MESSAGE);
    return blob;
  } finally {
    bitmap.close();
  }
}

// Rotating a rectangle grows its bounding box; the rotated image must be drawn
// into that larger box or the corners get clipped before the crop is taken.
function rotatedBounds(width: number, height: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  return { width: cos * width + sin * height, height: sin * width + cos * height };
}

/**
 * Applies `rotation` (degrees) and then extracts `crop` — the croppedAreaPixels
 * that react-easy-crop reports, in the rotated image's own pixel space.
 *
 * Returns a near-lossless WebP intended to be handed to downscaleImage(), which
 * does the 512px cap and the final encode. Two canvases rather than one because
 * the crop must be lifted out of the ROTATED result: drawing the source canvas
 * into the second one is cleaner than getImageData/putImageData, which
 * round-trips premultiplied alpha and can shift edge pixels.
 */
export async function cropImage(source: Blob, crop: CropRect, rotation = 0): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new Error(FAILURE_MESSAGE);
  }

  try {
    const bounds = rotatedBounds(bitmap.width, bitmap.height, rotation);
    const rotated = document.createElement('canvas');
    rotated.width = Math.max(1, Math.round(bounds.width));
    rotated.height = Math.max(1, Math.round(bounds.height));

    const rotatedCtx = rotated.getContext('2d');
    if (!rotatedCtx) throw new Error(FAILURE_MESSAGE);

    // Rotate about the centre of the bounding box, then draw the image centred
    // in it — the same geometry react-easy-crop's own reference util uses, which
    // is what makes its croppedAreaPixels line up with this canvas.
    rotatedCtx.translate(rotated.width / 2, rotated.height / 2);
    rotatedCtx.rotate((rotation * Math.PI) / 180);
    rotatedCtx.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

    const width = Math.max(1, Math.round(crop.width));
    const height = Math.max(1, Math.round(crop.height));

    const output = document.createElement('canvas');
    output.width = width;
    output.height = height;

    const outputCtx = output.getContext('2d');
    if (!outputCtx) throw new Error(FAILURE_MESSAGE);
    outputCtx.drawImage(rotated, Math.round(crop.x), Math.round(crop.y), width, height, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      output.toBlob(resolve, OUTPUT_TYPE, CROP_QUALITY)
    );
    if (!blob) throw new Error(FAILURE_MESSAGE);
    return blob;
  } finally {
    bitmap.close();
  }
}
