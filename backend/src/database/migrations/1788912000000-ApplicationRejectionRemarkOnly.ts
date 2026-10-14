import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const readSql = (name: string) => readFileSync(join(__dirname, name), 'utf8');

export class ApplicationRejectionRemarkOnly1788912000000 implements MigrationInterface {
  readonly name = 'ApplicationRejectionRemarkOnly1788912000000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readSql('011_application_rejection_remark_only.sql'),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readSql('011_application_rejection_remark_only.down.sql'),
    );
  }
}
