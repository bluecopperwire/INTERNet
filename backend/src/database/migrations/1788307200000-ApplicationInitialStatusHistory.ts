import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

function readMigrationSql(fileName: string): string {
  return readFileSync(join(__dirname, fileName), 'utf8');
}

export class ApplicationInitialStatusHistory1788307200000
  implements MigrationInterface
{
  readonly name = 'ApplicationInitialStatusHistory1788307200000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('004_application_initial_status_history.sql'),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('004_application_initial_status_history.down.sql'),
    );
  }
}
