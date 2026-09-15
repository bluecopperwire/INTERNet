import type { DataSource } from 'typeorm';
import { PesoDashboardService } from './peso-dashboard.service';

describe('PesoDashboardService employer monitoring fields', () => {
  it('returns the account registration timestamp', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ count: '1' }])
      .mockResolvedValueOnce([
        {
          companyId: 3,
          companyName: 'Example Company',
          createdAt: '2026-09-15T08:00:00.000Z',
        },
      ]);
    const service = new PesoDashboardService(
      { query } as unknown as DataSource,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const result = await service.getAllCompanies({ page: 1, limit: 10 });

    expect(result.data[0]).toMatchObject({
      createdAt: '2026-09-15T08:00:00.000Z',
    });
    expect(String(query.mock.calls[1][0])).toContain(
      'ua.created_at AS "createdAt"',
    );
  });
});
