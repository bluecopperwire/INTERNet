import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const sql = readFileSync(
  join(__dirname, 'migrations', '014_admin_audit_logs.sql'),
  'utf8',
);

describe('Admin audit logs migration', () => {
  it('creates an append-only canonical audit store and all three trigger families', () => {
    expect(sql).toContain('CREATE TABLE public.audit_event');
    expect(sql).toContain('trg_audit_event_append_only');
    expect(sql).toContain('trg_account_canonical_audit');
    expect(sql).toContain('trg_application_canonical_audit');
    expect(sql).toContain('trg_referral_canonical_audit');
    expect(sql).toContain('trg_internship_canonical_audit');
  });

  it('uses the approved public lifecycle labels and preserves system actors', () => {
    expect(sql).toContain("'For Review (QC PESO)'");
    expect(sql).toContain("'Offer Received (Student)'");
    expect(sql).toContain("'Complete (Company)'");
    expect(sql).toContain("resolved_actor_email text := 'System'");
    expect(sql).toContain("NEW.user_role::text = 'student'");
  });

  it('backfills with unique provenance and skips conflicting reruns', () => {
    expect(sql).toContain('CONSTRAINT uq_audit_event_provenance');
    expect(sql).toContain('ON CONFLICT (provenance_key) DO NOTHING');
    expect(sql).toContain('backfill:application_status_history:');
    expect(sql).toContain('backfill:internship_assignment_status_history:');
  });
});
