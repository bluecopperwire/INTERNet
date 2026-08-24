import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

function readMigrationSql(fileName: string): string {
  return readFileSync(join(__dirname, fileName), 'utf8');
}

export class InitialSchema1785860400000 implements MigrationInterface {
  readonly name = 'InitialSchema1785860400000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readMigrationSql('001_initial_schema.sql'));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readMigrationSql('001_initial_schema.down.sql'));
  }
}
