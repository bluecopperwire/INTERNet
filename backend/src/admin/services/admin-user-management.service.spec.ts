import type { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import type { EmailQueueService } from '../../email/email-queue.service';
import { AdminUserManagementService } from './admin-user-management.service';

function makeService() {
  const query = jest.fn((sql: string) => {
    if (sql.includes('count(*) FILTER')) {
      return Promise.resolve([
        { total: '1', active: '1', suspended: '0', archived: '0' },
      ]);
    }
    if (sql.includes('count(*) AS total'))
      return Promise.resolve([{ total: '1' }]);
    return Promise.resolve([]);
  });
  const service = new AdminUserManagementService(
    { query } as unknown as DataSource,
    {} as EmailQueueService,
    {} as ConfigService,
  );
  return { query, service };
}

describe('AdminUserManagementService list fields', () => {
  it('joins and selects Program/Strand for student rows', async () => {
    const { query, service } = makeService();

    await service.listStudents({ page: 1, limit: 10 });

    const sql = query.mock.calls
      .map(([statement]) => String(statement))
      .join('\n');
    expect(sql).toContain('LEFT JOIN public.student_academic_information sai');
    expect(sql).toContain('sai.strand_program AS "strandProgram"');
  });

  it('joins and selects the standardized industry for employer rows', async () => {
    const { query, service } = makeService();

    await service.listEmployers({ page: 1, limit: 10 });

    const sql = query.mock.calls
      .map(([statement]) => String(statement))
      .join('\n');
    expect(sql).toContain(
      'LEFT JOIN public.industry i ON i.industry_id = c.industry_id',
    );
    expect(sql).toContain('i.industry_name AS "industryName"');
  });
});
