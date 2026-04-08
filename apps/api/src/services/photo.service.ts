import { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { MAX_PHOTOS_PER_EQUIPMENT } from '@rental/shared';
import { processAndSavePhoto, deletePhotoFiles } from '../lib/image/processor';
import { config } from '../config';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors/http-error';

const uploadsDir = path.resolve(process.cwd(), config.UPLOADS_DIR);

export async function uploadPhoto(
  app: FastifyInstance,
  equipmentId: string,
  uploadedBy: string,
  buffer: Buffer,
  mimeType: string,
  fileName: string,
) {
  // Check equipment exists
  const equipment = await app.prisma.equipment.findFirst({ where: { id: equipmentId, active: true } });
  if (!equipment) throw new NotFoundError('Equipment', equipmentId);

  // Check photo count limit
  const count = await app.prisma.equipmentPhoto.count({ where: { equipmentId } });
  if (count >= MAX_PHOTOS_PER_EQUIPMENT) {
    throw new ValidationError(`Maximum ${MAX_PHOTOS_PER_EQUIPMENT} photos per equipment allowed`);
  }

  const photoId = uuidv4();
  const processed = await processAndSavePhoto(buffer, mimeType, equipmentId, photoId, uploadsDir);

  const isFirstPhoto = count === 0;

  const photo = await app.prisma.equipmentPhoto.create({
    data: {
      id: photoId,
      equipmentId,
      fileName,
      filePath: processed.originalPath,
      fileSizeBytes: processed.fileSizeBytes,
      mimeType: 'image/jpeg', // Always stored as JPEG after processing
      widthPx: processed.widthPx,
      heightPx: processed.heightPx,
      isCover: isFirstPhoto,
      uploadedBy,
    },
  });

  // If first photo, set as cover on equipment record
  if (isFirstPhoto) {
    await app.prisma.equipment.update({
      where: { id: equipmentId },
      data: { coverPhotoId: photo.id },
    });
  }

  return {
    ...photo,
    urls: buildPhotoUrls(processed),
  };
}

export async function listPhotos(app: FastifyInstance, equipmentId: string) {
  const photos = await app.prisma.equipmentPhoto.findMany({
    where: { equipmentId },
    orderBy: { uploadedAt: 'desc' },
    include: { uploader: { select: { id: true, name: true } } },
  });

  return (photos as any[]).map((p: any) => ({
    ...p,
    urls: buildPhotoUrlsFromPath(p.filePath),
  }));
}

export async function updatePhoto(
  app: FastifyInstance,
  equipmentId: string,
  photoId: string,
  data: { caption?: string; isCover?: boolean },
) {
  const photo = await app.prisma.equipmentPhoto.findFirst({
    where: { id: photoId, equipmentId },
  });
  if (!photo) throw new NotFoundError('Photo', photoId);

  if (data.isCover) {
    // Unset previous cover
    await app.prisma.equipmentPhoto.updateMany({
      where: { equipmentId, isCover: true },
      data: { isCover: false },
    });

    // Set new cover
    const updated = await app.prisma.equipmentPhoto.update({
      where: { id: photoId },
      data: { isCover: true, caption: data.caption ?? photo.caption },
    });

    await app.prisma.equipment.update({
      where: { id: equipmentId },
      data: { coverPhotoId: photoId },
    });

    return { ...updated, urls: buildPhotoUrlsFromPath(updated.filePath) };
  }

  const updated = await app.prisma.equipmentPhoto.update({
    where: { id: photoId },
    data: { caption: data.caption },
  });

  return { ...updated, urls: buildPhotoUrlsFromPath(updated.filePath) };
}

export async function deletePhoto(app: FastifyInstance, equipmentId: string, photoId: string) {
  const photo = await app.prisma.equipmentPhoto.findFirst({
    where: { id: photoId, equipmentId },
  });
  if (!photo) throw new NotFoundError('Photo', photoId);

  // Delete files from disk
  await deletePhotoFiles(uploadsDir, photo.filePath);

  // If this was the cover photo, find the next most recent and promote it
  if (photo.isCover) {
    const nextPhoto = await app.prisma.equipmentPhoto.findFirst({
      where: { equipmentId, id: { not: photoId } },
      orderBy: { uploadedAt: 'desc' },
    });

    if (nextPhoto) {
      await app.prisma.equipmentPhoto.update({
        where: { id: nextPhoto.id },
        data: { isCover: true },
      });
      await app.prisma.equipment.update({
        where: { id: equipmentId },
        data: { coverPhotoId: nextPhoto.id },
      });
    } else {
      // No more photos — clear cover reference
      await app.prisma.equipment.update({
        where: { id: equipmentId },
        data: { coverPhotoId: null },
      });
    }
  }

  await app.prisma.equipmentPhoto.delete({ where: { id: photoId } });
  return { deleted: true };
}

export function buildPhotoUrls(processed: { thumbPath: string; mediumPath: string; originalPath: string }) {
  return {
    thumb: `/uploads/${processed.thumbPath}`,
    medium: `/uploads/${processed.mediumPath}`,
    original: `/uploads/${processed.originalPath}`,
  };
}

export function buildPhotoUrlsFromPath(originalFilePath: string) {
  const base = originalFilePath.replace(/_original\.jpg$/, '');
  return {
    thumb: `/uploads/${base}_thumb.jpg`,
    medium: `/uploads/${base}_medium.jpg`,
    original: `/uploads/${originalFilePath}`,
  };
}
