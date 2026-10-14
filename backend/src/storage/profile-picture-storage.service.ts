import { mkdir, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import {
  Injectable,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const PROFILE_PICTURE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

interface PersonPictureName {
  userAccountId: number;
  firstName: string;
  lastName: string;
}

interface CompanyPictureName {
  userAccountId: number;
  companyName: string;
}

@Injectable()
export class ProfilePictureStorageService {
  readonly maxBytes: number;
  private readonly driver: string;
  private readonly uploadRoot: string;
  private readonly pictureRoot: string;

  constructor(config: ConfigService) {
    this.driver = config.get<string>('FILE_STORAGE_DRIVER') ?? 'local';
    this.uploadRoot = resolve(
      config.get<string>('LOCAL_PUBLIC_STORAGE_ROOT') ??
        resolve(process.cwd(), 'uploads'),
    );
    this.pictureRoot = resolve(this.uploadRoot, 'profile_pictures');
    this.maxBytes = Number(
      config.get<string>('PROFILE_PICTURE_MAX_BYTES') ?? 5 * 1024 * 1024,
    );
  }

  storePerson(
    file: Express.Multer.File,
    identity: PersonPictureName,
  ): Promise<string> {
    const filenameBase = [
      identity.userAccountId,
      this.slug(identity.lastName),
      this.slug(identity.firstName),
      'pfp',
    ].join('-');
    return this.store(file, filenameBase);
  }

  storeCompany(
    file: Express.Multer.File,
    identity: CompanyPictureName,
  ): Promise<string> {
    const filenameBase = [
      identity.userAccountId,
      this.slug(identity.companyName),
      'pfp',
    ].join('-');
    return this.store(file, filenameBase);
  }

  async delete(storedPath: string | null): Promise<void> {
    if (!storedPath || !['local', 'test'].includes(this.driver)) return;

    const managedPrefixes = [
      {
        prefix: '/uploads/profile_pictures/',
        root: this.pictureRoot,
      },
      {
        prefix: '/uploads/company-logos/',
        root: resolve(this.uploadRoot, 'company-logos'),
      },
    ];
    const managed = managedPrefixes.find(({ prefix }) =>
      storedPath.startsWith(prefix),
    );
    if (!managed) return;

    const filename = storedPath.slice(managed.prefix.length);
    if (!filename || filename.includes('/') || filename.includes('\\')) return;
    const target = resolve(managed.root, filename);
    this.assertInside(managed.root, target);
    await rm(target, { force: true });
  }

  private async store(
    file: Express.Multer.File,
    filenameBase: string,
  ): Promise<string> {
    if (!['local', 'test'].includes(this.driver)) {
      throw new ServiceUnavailableException(
        'Profile picture storage is unavailable for the configured storage driver.',
      );
    }
    const extension = PROFILE_PICTURE_EXTENSIONS[file.mimetype];
    if (!extension) {
      throw new UnsupportedMediaTypeException(
        'Profile picture must be JPEG, PNG, WebP, or GIF.',
      );
    }
    if (!file.buffer?.length || file.buffer.length > this.maxBytes) {
      throw new UnsupportedMediaTypeException(
        `Profile picture must be between 1 and ${this.maxBytes} bytes.`,
      );
    }

    const filename = `${filenameBase}${extension}`;
    const target = resolve(this.pictureRoot, filename);
    this.assertInside(this.pictureRoot, target);
    await mkdir(this.pictureRoot, { recursive: true });
    await writeFile(target, file.buffer);
    return `/uploads/profile_pictures/${filename}`;
  }

  private slug(value: string): string {
    const normalized = value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalized || 'profile';
  }

  private assertInside(root: string, target: string): void {
    const pathFromRoot = relative(root, target);
    if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
      throw new Error('Invalid profile picture storage path');
    }
  }
}
