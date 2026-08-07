/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { DEV_SEED_ACCOUNTS } from '../src/database/seeds/development.seed';

function isTokenResponse(
  value: unknown,
): value is { accessToken: string; refreshToken: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'accessToken' in value &&
    typeof value.accessToken === 'string' &&
    'refreshToken' in value &&
    typeof value.refreshToken === 'string'
  );
}

describe('development-seed login accounts', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_ACCESS_SECRET = 'seed-validation-access-secret';
    process.env.JWT_REFRESH_SECRET = 'seed-validation-refresh-secret';
    process.env.COOKIE_DOMAIN = '';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);

    const rows = await dataSource.query<Array<{ name: string }>>(
      'SELECT current_database() AS name',
    );
    if (!rows[0].name.toLowerCase().includes('validation')) {
      throw new Error(
        'Refusing to test seeded logins outside a validation database.',
      );
    }
    if (!process.env.DEV_SEED_PASSWORD) {
      throw new Error('DEV_SEED_PASSWORD is required for seeded login tests.');
    }
  });

  it.each(DEV_SEED_ACCOUNTS)(
    'authenticates the fake $role account through POST /auth/login',
    async ({ email }) => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: process.env.DEV_SEED_PASSWORD })
        .expect(200);
      const body: unknown = response.body;
      expect(isTokenResponse(body)).toBe(true);
    },
  );

  afterAll(async () => {
    await app?.close();
  });
});
