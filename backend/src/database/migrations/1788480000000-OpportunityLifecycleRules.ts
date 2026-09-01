import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

function readMigrationSql(fileName: string): string {
  return readFileSync(join(__dirname, fileName), 'utf8');
}

export class OpportunityLifecycleRules1788480000000 implements MigrationInterface {
  readonly name = 'OpportunityLifecycleRules1788480000000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('006_opportunity_lifecycle_rules.sql'),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('006_opportunity_lifecycle_rules.down.sql'),
    );
  }
}
