import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

function readMigrationSql(fileName: string): string {
  return readFileSync(join(__dirname, fileName), 'utf8');
}

export class RemoveAcceptedReferralReversal1788393600000
  implements MigrationInterface
{
  readonly name = 'RemoveAcceptedReferralReversal1788393600000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('005_remove_accepted_referral_reversal.sql'),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      readMigrationSql('005_remove_accepted_referral_reversal.down.sql'),
    );
  }
}
