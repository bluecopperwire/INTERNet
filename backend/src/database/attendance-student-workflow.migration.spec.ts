import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Phase 3 attendance migration source', () => {
  const sql = readFileSync(
    join(__dirname, 'migrations', '008_attendance_student_workflow.sql'),
    'utf8',
  );

  it('installs only the three persisted statuses and removes obsolete columns', () => {
    expect(sql).toContain("ENUM ('present', 'absent', 'incomplete')");
    expect(sql).toContain('ALTER COLUMN time_in DROP NOT NULL');
    for (const column of [
      'time_in_status',
      'rendered_hours_status',
      'photo_file_path',
    ])
      expect(sql).toContain(`DROP COLUMN ${column}`);
  });

  it('maps closed rows to Present and past open rows to Incomplete without an expected-end cutoff', () => {
    expect(sql).toContain("WHEN time_out IS NOT NULL THEN 'present'");
    expect(sql).toContain("THEN 'incomplete'");
    expect(sql).not.toContain('expected_end_date');
  });

  it('preserves exact minute derivation with the one-hour deduction', () => {
    expect(sql).toMatch(
      /extract\(epoch FROM \(NEW\.time_out - NEW\.time_in\)\)[\s\S]*- 60/,
    );
  });
});
