import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Student availability days migration source', () => {
  const sql = readFileSync(
    join(__dirname, 'migrations', '010_student_availability_days.sql'),
    'utf8',
  );

  it('converts legacy schedules to validated exact weekday arrays', () => {
    expect(sql).toContain(
      "WHEN 'weekdays' THEN ARRAY[1, 2, 3, 4, 5]::smallint[]",
    );
    expect(sql).toContain("WHEN 'weekends' THEN ARRAY[6, 0]::smallint[]");
    expect(sql).toContain(
      "WHEN 'flexible' THEN ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]",
    );
    expect(sql).toContain('ck_internship_preference_available_days');
    expect(sql).toContain('public.fn_valid_working_days(available_days)');
  });
});
