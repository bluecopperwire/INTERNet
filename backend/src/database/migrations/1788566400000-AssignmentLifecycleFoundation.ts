import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

function readMigrationSql(fileName: string): string {
  return readFileSync(join(__dirname, fileName), 'utf8');
}

export class AssignmentLifecycleFoundation1788566400000 implements MigrationInterface {
  readonly name = 'AssignmentLifecycleFoundation1788566400000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('007_assignment_lifecycle_foundation.sql'),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('007_assignment_lifecycle_foundation.down.sql'),
    );
  }
}
