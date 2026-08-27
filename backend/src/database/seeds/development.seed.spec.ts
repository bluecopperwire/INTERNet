import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { seedDevelopmentData } from './development.seed';

jest.setTimeout(120_000);

const seedOwnedEmails = [
  'student.dev@example.com',
  'company.dev@example.com',
  'peso.dev@example.com',
  'admin.dev@example.com',
  'admin.dev@internet.local',
  'student.manual@internet.local',
  'student.google@internet.local',
  'student.dual@internet.local',
  'company.tech@internet.local',
  'company.hospitality@internet.local',
  'peso.approved@internet.local',
  'peso.pending@internet.local',
  'peso.rejected@internet.local',
] as const;

function restoreEnvironmentValue(
  name: string,
  value: string | undefined,
): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

describe('development seed authentication cleanup', () => {
  let container: StartedPostgreSqlContainer;
  let dataSource: DataSource;
  const previousEnvironment = {
    nodeEnv: process.env.NODE_ENV,
    allowDevSeed: process.env.ALLOW_DEV_SEED,
    password: process.env.DEV_SEED_PASSWORD,
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_DEV_SEED = 'true';
    process.env.DEV_SEED_PASSWORD = 'TestPassword123';

    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('development_seed_test_db')
      .withUsername('development_seed_user')
      .withPassword('development_seed_password')
      .start();
    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      synchronize: false,
      migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
      migrationsTransactionMode: 'none',
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (container) await container.stop();

    restoreEnvironmentValue('NODE_ENV', previousEnvironment.nodeEnv);
    restoreEnvironmentValue('ALLOW_DEV_SEED', previousEnvironment.allowDevSeed);
    restoreEnvironmentValue('DEV_SEED_PASSWORD', previousEnvironment.password);
  });

  it('clears sessions for all 13 seed-owned accounts but preserves an unrelated account session', async () => {
    await seedDevelopmentData(dataSource);
    const seededAccounts = await dataSource.query(
      `SELECT user_account_id, email
         FROM public.user_account
        WHERE email = ANY($1::text[])
        ORDER BY email`,
      [seedOwnedEmails],
    );
    expect(seededAccounts).toHaveLength(seedOwnedEmails.length);

    const sentinelAccount = await dataSource.transaction(async (manager) => {
      const rows = await manager.query(
        `INSERT INTO public.user_account (email, user_role)
         VALUES ('unrelated.session-sentinel@example.test', 'admin')
         RETURNING user_account_id`,
      );
      await manager.query(
        `INSERT INTO public.local_authentication_credential
           (user_account_id, password_hash)
         VALUES ($1, 'sentinel-local-password-hash')`,
        [rows[0].user_account_id],
      );
      return rows[0].user_account_id;
    });

    for (const account of seededAccounts) {
      await dataSource.query(
        `INSERT INTO public.authentication_session
           (user_account_id, token_family_id, refresh_token_hash, expires_at)
         VALUES ($1, $2, 'seed-owned-session-hash', CURRENT_TIMESTAMP + INTERVAL '1 day')`,
        [account.user_account_id, randomUUID()],
      );
    }
    await dataSource.query(
      `INSERT INTO public.authentication_session
         (user_account_id, token_family_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, 'sentinel-session-hash', CURRENT_TIMESTAMP + INTERVAL '1 day')`,
      [sentinelAccount, randomUUID()],
    );

    await seedDevelopmentData(dataSource);

    const [remainingSeedSessions] = await dataSource.query(
      `SELECT count(*)::integer AS count
         FROM public.authentication_session session
         JOIN public.user_account account
           ON account.user_account_id = session.user_account_id
        WHERE account.email = ANY($1::text[])`,
      [seedOwnedEmails],
    );
    expect(remainingSeedSessions.count).toBe(0);

    const [remainingSentinelSessions] = await dataSource.query(
      `SELECT count(*)::integer AS count
         FROM public.authentication_session
        WHERE user_account_id = $1`,
      [sentinelAccount],
    );
    expect(remainingSentinelSessions.count).toBe(1);
  });
});
