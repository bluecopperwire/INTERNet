import { UnsupportedMediaTypeException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const PROFILE_PICTURE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const profilePictureUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _request: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!PROFILE_PICTURE_MIME_TYPES.has(file.mimetype)) {
      callback(
        new UnsupportedMediaTypeException(
          'Profile picture must be JPEG, PNG, WebP, or GIF.',
        ),
        false,
      );
      return;
    }
    callback(null, true);
  },
};
