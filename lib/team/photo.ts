import "server-only";

import sharp from "sharp";

import { MAX_PHOTO_BYTES } from "./schemas";

export type StoredPhoto = { bytes: Buffer; type: "image/webp" };

/**
 * Accepts an uploaded image File, or null when none was chosen. Anything that is not a real image
 * (checked by decoding it) or is over the size limit throws a TeamPhotoError. The result is
 * re-encoded as a small WebP, which also strips EXIF data such as GPS position.
 */
export class TeamPhotoError extends Error {}

export async function processPhoto(file: FormDataEntryValue | null): Promise<StoredPhoto | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_PHOTO_BYTES) throw new TeamPhotoError("tooLarge");
  try {
    const bytes = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize(640, 640, { fit: "cover", position: "attention" })
      .webp({ quality: 80 })
      .toBuffer();
    return { bytes, type: "image/webp" };
  } catch {
    throw new TeamPhotoError("notImage");
  }
}
