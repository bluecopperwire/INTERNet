import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

function readMigrationSql(fileName: string): string {
  return readFileSync(join(__dirname, fileName), 'utf8');
}

export class ApprovedDatabaseRedesign1787788800000
  implements MigrationInterface
{
  readonly name = 'ApprovedDatabaseRedesign1787788800000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('002_approved_database_redesign.sql'),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('002_approved_database_redesign.down.sql'),
    );
  }
}
