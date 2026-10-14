import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Account user code migration', () => {
  const sql = readFileSync(
    join(__dirname, 'migrations', '012_account_user_code.sql'),
    'utf8',
  );

  it('keeps yearly sequences independent for each role', () => {
    expect(sql).toContain(
      'CONSTRAINT pk_account_user_code_counter PRIMARY KEY (account_year, user_role)',
    );
    expect(sql).toContain(
      "PARTITION BY EXTRACT(YEAR FROM created_at AT TIME ZONE 'Asia/Manila'), user_role",
    );
    expect(sql).toContain('ON CONFLICT (account_year, user_role)');
  });

  it('uses the approved role codes and five-digit suffix', () => {
    expect(sql).toContain("WHEN 'student' THEN 'STU'");
    expect(sql).toContain("WHEN 'company' THEN 'COM'");
    expect(sql).toContain("WHEN 'peso_personnel' THEN 'PES'");
    expect(sql).toContain("WHEN 'admin' THEN 'ADM'");
    expect(sql).toContain("lpad(next_value::text, 5, '0')");
  });

  it('makes generated account codes immutable', () => {
    expect(sql).toContain('Account code is assigned automatically');
    expect(sql).toContain('Account code, role, and creation date are immutable');
  });
});
