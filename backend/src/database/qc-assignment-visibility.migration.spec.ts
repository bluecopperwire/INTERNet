import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Phase 5 QC assignment visibility migration', () => {
  const sql = readFileSync(
    join(__dirname, 'migrations', '009_qc_assignment_visibility.sql'),
    'utf8',
  );

  it('adds an independent paired QC PESO soft-hide actor and timestamp', () => {
    expect(sql).toContain('qc_peso_hidden_at timestamptz');
    expect(sql).toContain('qc_peso_hidden_by_user_account_id integer');
    expect(sql).toContain('ck_assignment_visibility_qc_pair');
    expect(sql).toContain('fk_assignment_visibility_qc_actor');
    expect(sql).not.toContain('student_hidden_at =');
    expect(sql).not.toContain('employer_hidden_at =');
  });
});
