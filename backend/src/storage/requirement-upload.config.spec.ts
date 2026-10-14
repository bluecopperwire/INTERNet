import { UnsupportedMediaTypeException } from '@nestjs/common';
import type { Request } from 'express';
import { requirementUploadOptions } from './requirement-upload.config';

function filterFile(originalname: string, mimetype: string) {
  return new Promise<{ error: Error | null; accepted: boolean }>((resolve) => {
    requirementUploadOptions.fileFilter(
      {} as Request,
      { originalname, mimetype } as Express.Multer.File,
      (error, accepted) => resolve({ error, accepted }),
    );
  });
}

describe('requirementUploadOptions', () => {
  it('accepts PDF files, including uppercase extensions', async () => {
    await expect(filterFile('resume.PDF', 'application/pdf')).resolves.toEqual({
      error: null,
      accepted: true,
    });
  });

  it.each([
    [
      'resume.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    ['resume.docx', 'application/pdf'],
    ['resume.pdf', 'application/msword'],
  ])(
    'rejects non-PDF or mismatched uploads: %s',
    async (originalname, mimetype) => {
      const result = await filterFile(originalname, mimetype);
      expect(result.accepted).toBe(false);
      expect(result.error).toBeInstanceOf(UnsupportedMediaTypeException);
      expect(result.error?.message).toBe(
        'Unsupported file type. Only PDF files are allowed.',
      );
    },
  );
});
