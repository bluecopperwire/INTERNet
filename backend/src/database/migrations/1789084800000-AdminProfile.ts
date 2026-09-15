import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const readSql = (name: string) => readFileSync(join(__dirname, name), 'utf8');

export class AdminProfile1789084800000 implements MigrationInterface {
  readonly name = 'AdminProfile1789084800000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readSql('013_admin_profile.sql'));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readSql('013_admin_profile.down.sql'));
  }
}
