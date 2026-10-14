import { BadRequestException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { AdminAuditLogService } from './admin-audit-log.service';

describe('AdminAuditLogService', () => {
  it('returns newest-first paginated rows with public action labels', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([
        {
          auditEventId: '9',
          actionCode: 'account_suspended',
          entityEmail: 'student@example.test',
          entityCode: '2026-STU-00001',
          previousStatus: 'Active',
          newStatus: 'Suspended',
          actorEmail: 'admin@example.test',
          actorCode: '2026-ADM-00001',
          occurredAt: '2026-09-15T02:00:00.000Z',
        },
      ]);
    const service = new AdminAuditLogService({
      query,
    } as unknown as DataSource);

    const result = await service.list('accounts', {
      page: 1,
      limit: 5,
      search: 'STU-00001',
      action: 'account_suspended',
    });

    expect(result.data[0]).toMatchObject({
      action: 'Account Suspended',
      previousStatus: 'Active',
      newStatus: 'Suspended',
    });
    expect(result.meta).toEqual({ page: 1, limit: 5, total: 1, totalPages: 1 });
    expect(String(query.mock.calls[0][0])).toContain(
      'lower(ae.entity_email) LIKE',
    );
    expect(String(query.mock.calls[1][0])).toContain(
      'ORDER BY ae.occurred_at DESC, ae.audit_event_id DESC',
    );
  });

  it('rejects actions from another audit category and reversed date ranges', async () => {
    const service = new AdminAuditLogService({
      query: jest.fn(),
    } as unknown as DataSource);

    await expect(
      service.list('accounts', {
        page: 1,
        limit: 5,
        action: 'application_submitted',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.list('internships', {
        page: 1,
        limit: 5,
        dateFrom: '2026-09-16',
        dateTo: '2026-09-15',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exports matching rows with the same column order and system placeholders', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        auditEventId: '3',
        actionCode: 'internship_started',
        entityEmail: 'student@example.test',
        entityCode: '2026-STU-00001',
        previousStatus: 'Pending',
        newStatus: 'Ongoing',
        actorEmail: 'System',
        actorCode: null,
        occurredAt: '2026-09-15T00:00:00.000Z',
      },
    ]);
    const service = new AdminAuditLogService({
      query,
    } as unknown as DataSource);

    const csv = await service.exportCsv('internships', {
      page: 1,
      limit: 5,
    });

    expect(csv).toContain(
      '"Date and Time","Action","Entity Email","Entity Code"',
    );
    expect(csv).toContain('"Internship Started"');
    expect(csv).toContain('"System","—"');
  });
});
