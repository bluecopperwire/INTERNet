import type { DataSource, QueryRunner } from 'typeorm';

export async function setStatusActor(
  queryRunner: QueryRunner,
  userAccountId: number | null,
): Promise<void> {
  if (!queryRunner.isTransactionActive) {
    throw new Error('Status actor propagation requires an active transaction.');
  }

  await queryRunner.query(
    "SELECT set_config('app.current_user_account_id', $1, true)",
    [userAccountId === null ? '' : String(userAccountId)],
  );
}

export async function withStatusActor<T>(
  dataSource: DataSource,
  userAccountId: number | null,
  work: (queryRunner: QueryRunner) => Promise<T>,
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    await setStatusActor(queryRunner, userAccountId);
    const result = await work(queryRunner);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
