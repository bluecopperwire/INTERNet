import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const readSql = (name: string) => readFileSync(join(__dirname, name), 'utf8');

export class AdminAuditLogs1789171200000 implements MigrationInterface {
  readonly name = 'AdminAuditLogs1789171200000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readSql('014_admin_audit_logs.sql'));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readSql('014_admin_audit_logs.down.sql'));
  }
}
