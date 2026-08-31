import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { ProfilePictureStorageService } from './profile-picture-storage.service';

const imageFile = (
  mimetype: string,
  bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]),
): Express.Multer.File =>
  ({
    buffer: bytes,
    mimetype,
    fieldname: 'image',
    originalname: 'picture',
    encoding: '7bit',
    size: bytes.length,
    destination: '',
    filename: '',
    path: '',
    stream: undefined as never,
  }) satisfies Express.Multer.File;

describe('ProfilePictureStorageService', () => {
  let uploadRoot: string;
  let service: ProfilePictureStorageService;

  beforeEach(() => {
    uploadRoot = mkdtempSync(join(tmpdir(), 'profile-pictures-'));
    service = new ProfilePictureStorageService(
      new ConfigService({
        FILE_STORAGE_DRIVER: 'test',
        LOCAL_PUBLIC_STORAGE_ROOT: uploadRoot,
      }),
    );
  });

  afterEach(() => rmSync(uploadRoot, { recursive: true, force: true }));

  it('stores a student or QC PESO picture using the UID-lastname-firstname convention', async () => {
    const storedPath = await service.storePerson(imageFile('image/png'), {
      userAccountId: 42,
      firstName: 'Juan Miguel',
      lastName: 'Dela Cruz',
    });

    expect(storedPath).toBe(
      '/uploads/profile_pictures/42-dela-cruz-juan-miguel-pfp.png',
    );
    expect(
      existsSync(
        join(
          uploadRoot,
          'profile_pictures',
          '42-dela-cruz-juan-miguel-pfp.png',
        ),
      ),
    ).toBe(true);
  });

  it('stores an employer picture using the UID-companyname convention and replaces it', async () => {
    const first = imageFile('image/jpeg', Buffer.from('first'));
    const second = imageFile('image/jpeg', Buffer.from('second'));

    const storedPath = await service.storeCompany(first, {
      userAccountId: 9,
      companyName: 'ACME & Sons, Inc.',
    });
    await service.storeCompany(second, {
      userAccountId: 9,
      companyName: 'ACME & Sons, Inc.',
    });

    expect(storedPath).toBe(
      '/uploads/profile_pictures/9-acme-sons-inc-pfp.jpg',
    );
    expect(
      readFileSync(
        join(uploadRoot, 'profile_pictures', '9-acme-sons-inc-pfp.jpg'),
      ),
    ).toEqual(second.buffer);
  });

  it('rejects unsupported media types', async () => {
    await expect(
      service.storePerson(imageFile('text/plain'), {
        userAccountId: 1,
        firstName: 'Test',
        lastName: 'User',
      }),
    ).rejects.toMatchObject({ status: 415 });
  });
});
