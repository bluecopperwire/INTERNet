import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, getOptionsToken } from '@nestjs/throttler';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';

export class EmployerE2eEnvironment {
  app!: INestApplication;
  dataSource!: DataSource;
  uploadRoot!: string;
  documentRoot!: string;
  databaseName!: string;

  private container?: StartedPostgreSqlContainer;
  private originalCwd = process.cwd();
  private testCwd?: string;

  async start(): Promise<void> {
    this.databaseName = `employer_e2e_${randomUUID().replaceAll('-', '')}`;
    this.container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase(this.databaseName)
      .withUsername('employer_e2e')
      .withPassword(randomUUID())
      .start();

    this.testCwd = mkdtempSync(join(tmpdir(), 'internet-employer-e2e-'));
    this.uploadRoot = join(this.testCwd, 'public-uploads');
    this.documentRoot = join(this.testCwd, 'uploads', 'requirements');
    process.chdir(this.testCwd);

    process.env.NODE_ENV = 'test';
    process.env.DATABASE_HOST = this.container.getHost();
    process.env.DATABASE_PORT = String(this.container.getPort());
    process.env.DATABASE_USER = this.container.getUsername();
    process.env.DATABASE_PASSWORD = this.container.getPassword();
    process.env.DATABASE_NAME = this.container.getDatabase();
    process.env.JWT_ACCESS_SECRET = 'employer-e2e-access-secret';
    process.env.JWT_REFRESH_SECRET = 'employer-e2e-refresh-secret';
    process.env.FILE_STORAGE_DRIVER = 'test';
    process.env.LOCAL_PUBLIC_STORAGE_ROOT = this.uploadRoot;

    // Runtime loading is deliberate: ConfigModule must not evaluate until the
    // container-provided environment variables above are in place.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AppModule } = require('../../../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(getOptionsToken())
      .useValue([{ ttl: 60_000, limit: 100_000 }])
      .compile();

    this.app = moduleRef.createNestApplication();
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    this.dataSource = this.app.get(DataSource);
    this.assertDisposableDatabase();
    await this.dataSource.runMigrations({ transaction: 'none' });
    await this.app.init();
  }

  assertDisposableDatabase(): void {
    if (process.env.NODE_ENV !== 'test' || !this.container) {
      throw new Error(
        'Refusing E2E database access outside a live test container.',
      );
    }
    const options = this.dataSource.options as {
      host?: string;
      port?: number;
      database?: string;
    };
    if (
      options.database !== this.databaseName ||
      options.host !== this.container.getHost() ||
      Number(options.port) !== this.container.getPort() ||
      !this.databaseName.startsWith('employer_e2e_')
    ) {
      throw new Error(
        'Refusing destructive reset: database is not the E2E container.',
      );
    }
  }

  async resetDatabase(): Promise<void> {
    this.assertDisposableDatabase();
    const rows: Array<{ tablename: string }> = await this.dataSource.query(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND tablename <> 'migrations'`,
    );
    if (rows.length) {
      const tables = rows
        .map(({ tablename }) => `public."${tablename.replaceAll('"', '""')}"`)
        .join(', ');
      await this.dataSource.query(
        `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
      );
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.app) await this.app.close();
    } finally {
      process.chdir(this.originalCwd);
      if (this.container) await this.container.stop();
      if (this.testCwd) rmSync(this.testCwd, { recursive: true, force: true });
    }
  }
}
