import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { ALLOWED_IMAGE_MIME_TYPES } from '@rental/shared';

export interface ProcessedPhoto {
  thumbPath: string;
  mediumPath: string;
  originalPath: string;
  widthPx: number;
  heightPx: number;
  fileSizeBytes: number;
}

export async function processAndSavePhoto(
  buffer: Buffer,
  mimeType: string,
  equipmentId: string,
  photoId: string,
  uploadsDir: string,
): Promise<ProcessedPhoto> {
  // Validate MIME type
  const validMimes = ALLOWED_IMAGE_MIME_TYPES as readonly string[];
  if (!validMimes.includes(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}. Allowed: ${validMimes.join(', ')}`);
  }

  const dir = path.join(uploadsDir, 'equipment', equipmentId);
  await fs.mkdir(dir, { recursive: true });

  // Create sharp instance — handles HEIC/HEIF conversion automatically
  const img = sharp(buffer, { failOn: 'error' });
  const metadata = await img.metadata();

  const originalWidth = metadata.width ?? 0;
  const originalHeight = metadata.height ?? 0;

  // Strip EXIF metadata for privacy
  const base = img.rotate().withMetadata({ orientation: undefined });

  // Original: convert to JPEG, strip EXIF, full resolution
  const originalPath = path.join(dir, `${photoId}_original.jpg`);
  await base.clone().jpeg({ quality: 90 }).toFile(originalPath);

  // Medium: 800px wide, proportional
  const mediumPath = path.join(dir, `${photoId}_medium.jpg`);
  await base.clone().resize(800, undefined, { withoutEnlargement: true }).jpeg({ quality: 85 }).toFile(mediumPath);

  // Thumb: 200x200 square crop
  const thumbPath = path.join(dir, `${photoId}_thumb.jpg`);
  await base.clone().resize(200, 200, { fit: 'cover', position: 'center' }).jpeg({ quality: 80 }).toFile(thumbPath);

  const { size: fileSizeBytes } = await fs.stat(originalPath);

  return {
    thumbPath: path.relative(uploadsDir, thumbPath).replace(/\\/g, '/'),
    mediumPath: path.relative(uploadsDir, mediumPath).replace(/\\/g, '/'),
    originalPath: path.relative(uploadsDir, originalPath).replace(/\\/g, '/'),
    widthPx: originalWidth,
    heightPx: originalHeight,
    fileSizeBytes,
  };
}

export async function deletePhotoFiles(uploadsDir: string, filePath: string): Promise<void> {
  const base = filePath.replace(/_original\.jpg$/, '');
  const sizes = ['_original.jpg', '_medium.jpg', '_thumb.jpg'];
  for (const suffix of sizes) {
    const fullPath = path.join(uploadsDir, base + suffix);
    try {
      await fs.unlink(fullPath);
    } catch {
      // File may not exist — ignore
    }
  }
}
