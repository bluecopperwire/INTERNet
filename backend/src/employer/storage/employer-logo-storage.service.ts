import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import {
  Injectable,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const LOGO_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

@Injectable()
export class EmployerLogoStorageService {
  readonly maxBytes: number;
  private readonly driver: string;
  private readonly uploadRoot: string;
  private readonly logoRoot: string;

  constructor(config: ConfigService) {
    this.driver = config.get<string>('FILE_STORAGE_DRIVER') ?? 'local';
    this.uploadRoot = resolve(
      config.get<string>('LOCAL_PUBLIC_STORAGE_ROOT') ??
        resolve(process.cwd(), 'uploads'),
    );
    this.logoRoot = resolve(this.uploadRoot, 'company-logos');
    this.maxBytes = Number(
      config.get<string>('COMPANY_LOGO_MAX_BYTES') ?? 5 * 1024 * 1024,
    );
  }

  async store(file: Express.Multer.File): Promise<string> {
    if (!['local', 'test'].includes(this.driver)) {
      throw new ServiceUnavailableException(
        'Company logo storage is unavailable for the configured storage driver.',
      );
    }
    const extension = LOGO_EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new UnsupportedMediaTypeException(
        'Company logo must be JPEG, PNG, WebP, or GIF.',
      );
    }
    if (!file.buffer?.length || file.buffer.length > this.maxBytes) {
      throw new UnsupportedMediaTypeException(
        `Company logo must be between 1 and ${this.maxBytes} bytes.`,
      );
    }

    const filename = `${randomUUID()}${extension}`;
    const target = resolve(this.logoRoot, filename);
    this.assertInside(this.logoRoot, target);
    await mkdir(this.logoRoot, { recursive: true });
    await writeFile(target, file.buffer, { flag: 'wx' });
    return `/uploads/company-logos/${filename}`;
  }

  async delete(storedPath: string | null): Promise<void> {
    if (!storedPath?.startsWith('/uploads/company-logos/')) return;
    if (!['local', 'test'].includes(this.driver)) return;
    const filename = storedPath.slice('/uploads/company-logos/'.length);
    if (!filename || filename.includes('/') || filename.includes('\\')) return;
    const target = resolve(this.logoRoot, filename);
    this.assertInside(this.logoRoot, target);
    await rm(target, { force: true });
  }

  private assertInside(root: string, target: string): void {
    const pathFromRoot = relative(root, target);
    if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
      throw new Error('Invalid company logo storage path');
    }
  }
}
