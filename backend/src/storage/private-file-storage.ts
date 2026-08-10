import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import {
  Injectable,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PrivateFileInput {
  data: Buffer;
  mimeType: string;
  originalName?: string;
}

export interface PrivateFileStorage {
  storeEmployeeId(input: PrivateFileInput): Promise<string>;
  delete(key: string): Promise<void>;
}

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

@Injectable()
export class StorageService implements PrivateFileStorage {
  private readonly driver: string;
  private readonly root: string;
  private readonly maxBytes: number;

  constructor(config: ConfigService) {
    this.driver = config.get<string>('FILE_STORAGE_DRIVER') ?? 'local';
    this.root = resolve(
      config.get<string>('LOCAL_PRIVATE_STORAGE_ROOT') ??
        join(process.cwd(), '.private-storage'),
    );
    this.maxBytes = Number(
      config.get<string>('EMPLOYEE_ID_MAX_BYTES') ?? 5 * 1024 * 1024,
    );
  }

  async storeEmployeeId(input: PrivateFileInput): Promise<string> {
    if (this.driver === 'file-server') {
      throw new ServiceUnavailableException(
        'Production file-server adapter is not configured; protocol and credential contract are required.',
      );
    }
    if (!['local', 'test'].includes(this.driver)) {
      throw new ServiceUnavailableException(
        `Unsupported private storage driver: ${this.driver}`,
      );
    }
    const extension = MIME_EXTENSIONS[input.mimeType];
    if (!extension)
      throw new UnsupportedMediaTypeException(
        'Employee ID must be JPEG, PNG, or PDF',
      );
    if (input.data.length === 0 || input.data.length > this.maxBytes) {
      throw new UnsupportedMediaTypeException(
        `Employee ID must be between 1 and ${this.maxBytes} bytes`,
      );
    }
    const key = `peso-employee-ids/${randomUUID()}${extension || extname(input.originalName ?? '')}`;
    const target = resolve(this.root, key);
    if (!target.startsWith(this.root)) throw new Error('Invalid storage key');
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, input.data, { flag: 'wx' });
    return key;
  }

  async delete(key: string): Promise<void> {
    if (!['local', 'test'].includes(this.driver)) return;
    const target = resolve(this.root, key);
    if (!target.startsWith(this.root)) throw new Error('Invalid storage key');
    await rm(target, { force: true });
  }
}
