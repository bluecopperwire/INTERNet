import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const readSql = (name: string) => readFileSync(join(__dirname, name), 'utf8');

export class QcAssignmentVisibility1788739200000 implements MigrationInterface {
  readonly name = 'QcAssignmentVisibility1788739200000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readSql('009_qc_assignment_visibility.sql'));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readSql('009_qc_assignment_visibility.down.sql'));
  }
}
