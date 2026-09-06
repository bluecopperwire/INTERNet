import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Application rejection remark migration source', () => {
  const sql = readFileSync(
    join(__dirname, 'migrations', '011_application_rejection_remark_only.sql'),
    'utf8',
  );

  it('clears non-rejection remarks and prevents future reuse', () => {
    expect(sql).toContain("application_status <> 'rejected_for_referral'");
    expect(sql).toContain('SET remark = NULL');
    expect(sql).toContain('ck_application_remark_rejection_only');
    expect(sql).toContain("application_status = 'rejected_for_referral'");
    expect(sql).toContain('OR remark IS NULL');
  });
});
