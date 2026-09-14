import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Admin profile migration', () => {
  const sql = readFileSync(
    join(__dirname, 'migrations', '013_admin_profile.sql'),
    'utf8',
  );

  it('creates one profile for each Admin account and backfills existing Admins', () => {
    expect(sql).toContain('CREATE TABLE public.admin_profile')
    expect(sql).toContain('UNIQUE (user_account_id)')
    expect(sql).toContain("WHERE user_role = 'admin'")
    expect(sql).toContain('CREATE TRIGGER trg_create_admin_profile')
  })

  it('supports the standardized personal and contact profile fields', () => {
    for (const column of [
      'first_name',
      'middle_name',
      'last_name',
      'extension_name',
      'sex',
      'birth_date',
      'address_line',
      'address_barangay',
      'address_district',
      'address_city',
      'contact_email',
      'contact_number',
      'photo_file_path',
    ]) {
      expect(sql).toContain(column)
    }
  })
})
