import dataSource from './data-source';
import { seedDevelopmentData } from '../database/seeds/development.seed';
import { seedReferenceData } from '../database/seeds/reference.seed';

async function main(): Promise<void> {
  const task = process.argv[2];
  if (!['seed:reference', 'seed:dev'].includes(task)) {
    throw new Error('Expected a database task: seed:reference or seed:dev.');
  }

  await dataSource.initialize();
  try {
    if (task === 'seed:reference') {
      const result = await seedReferenceData(dataSource);
      console.log(
        `Reference seed complete: ${result.industriesInserted} industries inserted, ` +
          `${result.industriesCanonicalized} canonicalized; ` +
          `${result.requirementTypesInserted} requirement types inserted, ` +
          `${result.requirementTypesCanonicalized} canonicalized.`,
      );
      return;
    }

    const result = await seedDevelopmentData(dataSource);
    console.log('Development seed complete. Fake login accounts:');
    for (const account of result.accounts) {
      console.log(`- ${account.role}: ${account.email}`);
    }
    console.log(`Password source: ${result.passwordSource}.`);
  } finally {
    await dataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Database task failed: ${message}`);
  process.exitCode = 1;
});
