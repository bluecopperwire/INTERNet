import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

function readMigrationSql(fileName: string): string {
  return readFileSync(join(__dirname, fileName), 'utf8');
}

export class ApplicationWorkflowAlignment1788220800000 implements MigrationInterface {
  readonly name = 'ApplicationWorkflowAlignment1788220800000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('003_application_workflow_alignment.sql'),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('003_application_workflow_alignment.down.sql'),
    );
  }
}
