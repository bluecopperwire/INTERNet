import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5433', 10),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [
    __dirname + '/../**/*.entity{.ts,.js}',
    __dirname + '/../**/*.entities{.ts,.js}',
  ],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  migrationsTransactionMode: 'none' as const,
  synchronize: false,
}));
