import { ServiceUnavailableException } from '@nestjs/common';

export function dbMigrationPending(
  dependency: 'DB-EMP-001' | 'DB-EMP-002' | 'DB-EMP-003',
  message: string,
): ServiceUnavailableException {
  return new ServiceUnavailableException({
    statusCode: 503,
    code: 'DB_MIGRATION_PENDING',
    dependency,
    message,
  });
}
