export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PHOTOS_PER_EQUIPMENT = 30;
export const MAX_PHOTOS_PER_INSPECTION = 10;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const PHOTO_SIZES = {
  thumb: { width: 200, height: 200 },
  medium: { width: 800 },
  original: {},
} as const;

export type PhotoSize = keyof typeof PHOTO_SIZES;
