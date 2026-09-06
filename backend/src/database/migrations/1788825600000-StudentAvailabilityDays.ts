import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MigrationInterface, QueryRunner } from 'typeorm';

const readSql = (name: string) => readFileSync(join(__dirname, name), 'utf8');

export class StudentAvailabilityDays1788825600000 implements MigrationInterface {
  readonly name = 'StudentAvailabilityDays1788825600000';
  readonly transaction = false;

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readSql('010_student_availability_days.sql'));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(readSql('010_student_availability_days.down.sql'));
  }
}
