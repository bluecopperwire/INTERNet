import type { DataSource } from 'typeorm';
import { AttendanceQueryService } from './attendance-query.service';

describe('AttendanceQueryService Phase 3 compatibility', () => {
  it('reads only the finalized attendance summary counts', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([
        {
          presentCount: 2,
          absentCount: 1,
          incompleteCount: 1,
        },
      ]);
    const service = new AttendanceQueryService({
      query,
    } as unknown as DataSource);

    const result = await service.getInternsSummary({}, { page: 1, limit: 20 });

    expect(result.data[0]).toMatchObject({
      presentCount: 2,
      absentCount: 1,
      incompleteCount: 1,
    });
    const sql = String(query.mock.calls[1][0]);
    expect(sql).toContain('present_count AS "presentCount"');
    expect(sql).toContain('absent_count AS "absentCount"');
    expect(sql).toContain('incomplete_count AS "incompleteCount"');
    for (const obsoleteCount of [
      'complete_count AS',
      'late_count AS',
      'undertime_count AS',
      'overtime_count AS',
    ]) {
      expect(sql).not.toContain(`\n        ${obsoleteCount}`);
    }
  });
});
