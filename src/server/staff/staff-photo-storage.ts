import "server-only";

import { randomUUID } from "node:crypto";
import { BlobError, put } from "@vercel/blob";
import sharp from "sharp";

export class StaffPhotoStorageUnavailableError extends Error {
  constructor(readonly originalError?: unknown) {
    super("Staff photo storage is not available.");
    this.name = "StaffPhotoStorageUnavailableError";
  }
}

export type StoredStaffPhoto = {
  url: string;
  pathname: string;
  contentType: string;
};

export async function storeStaffPhoto(
  schoolId: string,
  employmentId: string,
  file: File,
): Promise<StoredStaffPhoto> {
  if (!process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    throw new StaffPhotoStorageUnavailableError();
  }

  const source = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(source)
    .rotate()
    .resize(1080, 1080, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const pathname = `schools/${schoolId}/staff/${employmentId}/profile-${randomUUID()}.webp`;
  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(pathname, webp, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/webp",
    });
  } catch (error) {
    if (error instanceof BlobError) {
      throw new StaffPhotoStorageUnavailableError(error);
    }
    throw error;
  }
  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
  };
}
