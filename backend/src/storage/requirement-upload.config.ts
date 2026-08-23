import { UnsupportedMediaTypeException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import type { Request } from 'express';

const UPLOADS_DESTINATION = resolve(process.cwd(), 'uploads', 'requirements');

if (!existsSync(UPLOADS_DESTINATION)) {
  mkdirSync(UPLOADS_DESTINATION, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const requirementUploadOptions = {
  storage: diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb) => {
      if (!existsSync(UPLOADS_DESTINATION)) {
        mkdirSync(UPLOADS_DESTINATION, { recursive: true });
      }
      cb(null, UPLOADS_DESTINATION);
    },
    filename: (req: Request, file: Express.Multer.File, cb) => {
      const rawId = req.params?.id;
      const studentId = Array.isArray(rawId) ? rawId[0] : (rawId ?? 'student');
      const extension = extname(file.originalname).toLowerCase();
      const sanitizedBase = file.originalname
        .replace(extension, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 30);
      const uniqueName = `req-${String(studentId)}-${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizedBase}${extension}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new UnsupportedMediaTypeException(
          `Unsupported file type: ${file.mimetype}. Allowed types: PDF, JPEG, PNG, DOC, DOCX.`,
        ),
        false,
      );
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
};
