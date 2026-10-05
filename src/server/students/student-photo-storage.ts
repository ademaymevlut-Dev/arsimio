import "server-only";

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import sharp from "sharp";

export type StoredStudentPhoto = {
  url: string;
  pathname: string;
  contentType: string;
};

export async function storeStudentPhoto(
  schoolId: string,
  studentProfileId: string,
  file: File,
): Promise<StoredStudentPhoto> {
  const source = Buffer.from(await file.arrayBuffer());
  const webp = await sharp(source)
    .rotate()
    .resize(640, 640, { fit: "cover", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const pathname = `schools/${schoolId}/students/${studentProfileId}/profile-${randomUUID()}.webp`;
  const blob = await put(pathname, webp, {
    access: "public",
    addRandomSuffix: false,
    contentType: "image/webp",
  });
  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
  };
}
