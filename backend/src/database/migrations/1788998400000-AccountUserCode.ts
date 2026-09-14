import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const readSql = (name: string) => readFileSync(join(__dirname, name), 'utf8');

export class AccountUserCode1788998400000 implements MigrationInterface {
  readonly name = 'AccountUserCode1788998400000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readSql('012_account_user_code.sql'));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readSql('012_account_user_code.down.sql'));
  }
}
