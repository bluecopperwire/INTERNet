import { ConfigService } from '@nestjs/config';
import { StorageService } from './private-file-storage';

describe('StorageService validation', () => {
  const config = {
    get: (name: string) =>
      ({ FILE_STORAGE_DRIVER: 'test', EMPLOYEE_ID_MAX_BYTES: '4' })[name],
  } as ConfigService;
  const storage = new StorageService(config);

  it('rejects unsupported employee-ID media types', async () => {
    await expect(
      storage.storeEmployeeId({
        data: Buffer.from('x'),
        mimeType: 'text/plain',
      }),
    ).rejects.toThrow('JPEG, PNG, or PDF');
  });

  it('rejects employee-ID files over the configured limit', async () => {
    await expect(
      storage.storeEmployeeId({
        data: Buffer.from('12345'),
        mimeType: 'image/png',
      }),
    ).rejects.toThrow('between 1 and 4 bytes');
  });
});
