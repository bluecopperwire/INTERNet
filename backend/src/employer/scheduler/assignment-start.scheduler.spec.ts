/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method */
import type { DataSource, QueryRunner } from 'typeorm';
import { AssignmentStartScheduler } from './assignment-start.scheduler';

function schedulerMocks(dueIds: number[], updated = true) {
  const runnerQuery = jest.fn(
    async (sql: string, parameters?: unknown[], structured?: boolean) => {
      if (sql.includes('set_config')) return [];
      if (sql.includes('UPDATE public.internship_assignment')) {
        const records = updated
          ? [{ internship_assignment_id: Number(parameters?.[0]) }]
          : [];
        return structured
          ? { raw: records, records, affected: records.length }
          : records;
      }
      return [];
    },
  );
  const runner = {
    isTransactionActive: true,
    query: runnerQuery,
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  } as unknown as QueryRunner;
  const dataSource = {
    query: jest
      .fn()
      .mockResolvedValue(
        dueIds.map((id) => ({ internship_assignment_id: id })),
      ),
    createQueryRunner: jest.fn(() => runner),
  } as unknown as DataSource;
  return { dataSource, runnerQuery };
}

describe('AssignmentStartScheduler', () => {
  it('moves a selected due pending assignment to ongoing transactionally', async () => {
    const { dataSource, runnerQuery } = schedulerMocks([10]);
    const scheduler = new AssignmentStartScheduler(dataSource);
    await expect(scheduler.transitionDueAssignments()).resolves.toBe(1);
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining(
        "assignment_status = 'pending' AND start_date <= $1::date",
      ),
      [expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)],
    );
    expect(runnerQuery).toHaveBeenCalledWith(
      expect.stringContaining("SET assignment_status = 'ongoing'"),
      [10, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)],
      true,
    );
  });

  it('counts every due assignment returned by structured update results', async () => {
    const { dataSource } = schedulerMocks([10, 11]);
    const scheduler = new AssignmentStartScheduler(dataSource);

    await expect(scheduler.transitionDueAssignments()).resolves.toBe(2);
  });

  it('leaves future pending and all non-pending assignments untouched', async () => {
    const { dataSource } = schedulerMocks([]);
    const scheduler = new AssignmentStartScheduler(dataSource);
    await expect(scheduler.transitionDueAssignments()).resolves.toBe(0);
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('runs the same transition logic during startup catch-up', async () => {
    const { dataSource } = schedulerMocks([]);
    const scheduler = new AssignmentStartScheduler(dataSource);
    const transition = jest
      .spyOn(scheduler, 'transitionDueAssignments')
      .mockResolvedValue(0);
    await scheduler.onModuleInit();
    expect(transition).toHaveBeenCalledTimes(1);
  });
});
