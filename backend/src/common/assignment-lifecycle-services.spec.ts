import type { DataSource, QueryRunner } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import { StudentsService } from '../students/services/students.service';
import { PesoDashboardService } from '../dashboard/services/peso-dashboard.service';

type QueryResolver = (sql: string, parameters: readonly unknown[]) => unknown[];

function createDataSource(resolver: QueryResolver) {
  const query = jest.fn((sql: string, parameters: readonly unknown[] = []) =>
    Promise.resolve(resolver(sql, parameters)),
  );
  const commitTransaction = jest.fn(() => Promise.resolve());
  const rollbackTransaction = jest.fn(() => Promise.resolve());
  const runner = {
    isTransactionActive: true,
    connect: jest.fn(() => Promise.resolve()),
    startTransaction: jest.fn(() => Promise.resolve()),
    commitTransaction,
    rollbackTransaction,
    release: jest.fn(() => Promise.resolve()),
    query,
  } as unknown as QueryRunner;
  const dataSource = {
    createQueryRunner: () => runner,
  } as unknown as DataSource;

  return { dataSource, query, commitTransaction, rollbackTransaction };
}

function createStudentsService(dataSource: DataSource) {
  return new StudentsService({} as never, dataSource, {} as never);
}

function createPesoService(dataSource: DataSource) {
  return new PesoDashboardService(
    dataSource,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

describe('assignment lifecycle service foundations', () => {
  it.each(['pending', 'ongoing'])(
    'allows a Student to withdraw an owned %s assignment atomically',
    async (assignmentStatus) => {
      const { dataSource, query, commitTransaction, rollbackTransaction } =
        createDataSource((sql) => {
          if (sql.includes('set_config')) return [];
          if (sql.includes('FOR UPDATE OF ia')) {
            return [{ assignment_status: assignmentStatus }];
          }
          if (sql.includes("SET assignment_status = 'withdrawn'")) {
            return [
              {
                internship_assignment_id: 41,
                assignment_status: 'withdrawn',
                student_withdrawal_remark: 'Changing career direction.',
              },
            ];
          }
          throw new Error(`Unexpected SQL: ${sql}`);
        });

      const result = await createStudentsService(dataSource).withdrawAssignment(
        12,
        41,
        { userAccountId: 112 },
        { remark: '  Changing career direction.  ' },
      );

      expect(result).toMatchObject({ assignment_status: 'withdrawn' });
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("SET assignment_status = 'withdrawn'"),
        [41, 'Changing career direction.'],
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('a.student_id = $2'),
        [41, 12],
      );
      expect(commitTransaction).toHaveBeenCalledTimes(1);
      expect(rollbackTransaction).not.toHaveBeenCalled();
    },
  );

  it('rejects Student withdrawal after Company completion', async () => {
    const { dataSource, rollbackTransaction } = createDataSource((sql) => {
      if (sql.includes('set_config')) return [];
      if (sql.includes('FOR UPDATE OF ia')) {
        return [{ assignment_status: 'complete_company' }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      createStudentsService(dataSource).withdrawAssignment(
        12,
        41,
        { userAccountId: 112 },
        { remark: 'Too late.' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(rollbackTransaction).toHaveBeenCalledTimes(1);
  });

  it('atomically stores the one-time Student review and completes the Student step', async () => {
    const statements: string[] = [];
    const { dataSource, query, commitTransaction } = createDataSource((sql) => {
      statements.push(sql);
      if (sql.includes('set_config')) return [];
      if (sql.includes('FOR UPDATE OF ia')) {
        return [{ assignment_status: 'complete_company' }];
      }
      if (sql.includes('SELECT internship_feedback_id')) return [];
      if (sql.includes('INSERT INTO public.internship_feedback')) {
        return [
          {
            internship_feedback_id: 9,
            rating: 5,
            remark: 'Excellent learning environment.',
          },
        ];
      }
      if (sql.includes("SET assignment_status = 'complete_student'")) return [];
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    const result = await createStudentsService(dataSource).submitCompanyReview(
      12,
      41,
      { userAccountId: 112 },
      { rating: 5, remark: '  Excellent learning environment.  ' },
    );

    expect(result).toMatchObject({
      internshipAssignmentId: 41,
      assignmentStatus: 'complete_student',
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO public.internship_feedback'),
      [41, 5, 'Excellent learning environment.'],
    );
    expect(
      statements.findIndex((sql) =>
        sql.includes('INSERT INTO public.internship_feedback'),
      ),
    ).toBeLessThan(
      statements.findIndex((sql) =>
        sql.includes("SET assignment_status = 'complete_student'"),
      ),
    );
    expect(commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a repeated Student Company review', async () => {
    const { dataSource, rollbackTransaction } = createDataSource((sql) => {
      if (sql.includes('set_config')) return [];
      if (sql.includes('FOR UPDATE OF ia')) {
        return [{ assignment_status: 'complete_company' }];
      }
      if (sql.includes('SELECT internship_feedback_id')) {
        return [{ internship_feedback_id: 9 }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      createStudentsService(dataSource).submitCompanyReview(
        12,
        41,
        { userAccountId: 112 },
        { rating: 4, remark: 'Repeated review.' },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(rollbackTransaction).toHaveBeenCalledTimes(1);
  });

  it.each(['complete_student', 'withdrawn', 'cancelled'])(
    'allows QC PESO to finalize %s without rewriting ended_at',
    async (assignmentStatus) => {
      const { dataSource, query, commitTransaction } = createDataSource(
        (sql) => {
          if (sql.includes('set_config')) return [];
          if (sql.includes('FOR UPDATE')) {
            return [
              {
                assignment_status: assignmentStatus,
                ended_at: '2026-09-01T08:00:00.000Z',
              },
            ];
          }
          if (sql.includes("SET assignment_status = 'finalized'")) {
            return [
              {
                internship_assignment_id: 41,
                assignment_status: 'finalized',
                ended_at: '2026-09-01T08:00:00.000Z',
                finalized_by_user_account_id: 501,
              },
            ];
          }
          throw new Error(`Unexpected SQL: ${sql}`);
        },
      );

      const result = await createPesoService(dataSource).finalizeAssignment(
        501,
        41,
      );

      expect(result).toMatchObject({
        assignment_status: 'finalized',
        ended_at: '2026-09-01T08:00:00.000Z',
      });
      const updateCall = query.mock.calls.find(([sql]) =>
        sql.includes("SET assignment_status = 'finalized'"),
      );
      expect(updateCall?.[0]).not.toMatch(/SET[\s\S]*ended_at\s*=/);
      expect(updateCall?.[1]).toEqual([41, 501]);
      expect(commitTransaction).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects direct QC PESO finalization from complete_company', async () => {
    const { dataSource, rollbackTransaction } = createDataSource((sql) => {
      if (sql.includes('set_config')) return [];
      if (sql.includes('FOR UPDATE')) {
        return [{ assignment_status: 'complete_company' }];
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(
      createPesoService(dataSource).finalizeAssignment(501, 41),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(rollbackTransaction).toHaveBeenCalledTimes(1);
  });
});
