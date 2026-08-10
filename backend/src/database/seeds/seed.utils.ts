import * as bcrypt from 'bcrypt';
import type { QueryRunner } from 'typeorm';
import { setStatusActor } from '../status-actor.transaction';

export const DEV_PREFIX = 'dev-seed/';

export function validateDevelopmentSeedEnvironment(): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seed:dev is prohibited when NODE_ENV=production.');
  }
  if (process.env.ALLOW_DEV_SEED !== 'true') {
    throw new Error('seed:dev requires ALLOW_DEV_SEED=true.');
  }
  const password = process.env.DEV_SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error(
      'DEV_SEED_PASSWORD is required and must contain at least 8 characters.',
    );
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error(
      'DEV_SEED_PASSWORD must contain at least one letter and one number.',
    );
  }
  return password;
}

export function hashDevelopmentPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function setActor(
  queryRunner: QueryRunner,
  userAccountId: number,
): Promise<void> {
  await setStatusActor(queryRunner, userAccountId);
}
