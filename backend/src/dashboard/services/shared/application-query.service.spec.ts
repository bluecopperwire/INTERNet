import 'reflect-metadata';
import type { DataSource } from 'typeorm';
import { ApplicationListView } from '../../dto/peso-dashboard.dto';
import { ApplicationQueryService } from './application-query.service';

describe('ApplicationQueryService', () => {
  it('enforces submitted/under_review membership for the QC PESO review queue', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ count: '0' }]).mockResolvedValueOnce([]);
    const service = new ApplicationQueryService({ query } as unknown as DataSource);

    await service.getApplications(
      { view: ApplicationListView.REVIEW, search: 'student', page: 1, limit: 20 },
      { page: 1, limit: 20 },
      undefined,
      true,
    );

    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements).toHaveLength(2);
    for (const sql of statements) {
      expect(sql).toContain("ad.application_status IN ('submitted', 'under_review')");
      expect(sql).toContain('av.qc_peso_hidden_at IS NOT NULL');
      expect(sql).toContain('ad.student_full_name ILIKE');
    }
    expect(statements[1]).toContain('r.referred_at');
  });

  it('does not collapse or lifecycle-filter history rows', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ count: '0' }]).mockResolvedValueOnce([]);
    const service = new ApplicationQueryService({ query } as unknown as DataSource);

    await service.getApplications(
      { view: ApplicationListView.HISTORY, page: 1, limit: 20 },
      { page: 1, limit: 20 },
      undefined,
      true,
    );

    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(sql).not.toContain("ad.application_status IN ('submitted', 'under_review')");
    expect(sql).not.toContain('DISTINCT ON');
    expect(sql).toContain('av.qc_peso_hidden_at IS NOT NULL');
  });
});
