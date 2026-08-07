import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import dataSource from './data-source';
import {
  AccountStatus,
  LocalAuthenticationCredential,
  UserAccount,
  UserRole,
} from '../users/entities/account.entities';
import {
  printReferenceSeedResults,
  seedReferenceData,
} from '../database/seeds/reference.seed';
import { seedDevelopmentData } from '../database/seeds/development.seed';

async function bootstrapAdmin(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error(
      'BOOTSTRAP_ADMIN_EMAIL and a 12+ character BOOTSTRAP_ADMIN_PASSWORD are required',
    );
  }
  await dataSource.transaction(async (manager) => {
    const existing = await manager
      .getRepository(UserAccount)
      .createQueryBuilder('a')
      .where('lower(a.email)=lower(:email)', { email })
      .getOne();
    if (existing) throw new Error('Bootstrap admin email already exists');
    const account = await manager.save(
      UserAccount,
      manager.create(UserAccount, {
        email: email.toLowerCase(),
        userRole: UserRole.ADMIN,
        accountStatus: AccountStatus.ACTIVE,
        deletedAt: null,
      }),
    );
    await manager.save(
      LocalAuthenticationCredential,
      manager.create(LocalAuthenticationCredential, {
        userAccountId: account.userAccountId,
        passwordHash: await bcrypt.hash(password, 12),
        passwordChangedAt: new Date(),
      }),
    );
  });
}

async function main(): Promise<void> {
  const task = process.argv[2];
  await dataSource.initialize();
  try {
    if (task === 'bootstrap:admin') await bootstrapAdmin();
    else if (task === 'seed:reference')
      printReferenceSeedResults(await seedReferenceData(dataSource));
    else if (task === 'seed:dev') await seedDevelopmentData(dataSource);
    else throw new Error(`Unknown database task: ${task ?? '<missing>'}`);
  } finally {
    await dataSource.destroy();
  }
}

void main();
