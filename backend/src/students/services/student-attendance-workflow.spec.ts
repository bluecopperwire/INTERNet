import { ConflictException, NotFoundException } from '@nestjs/common';
import type { DataSource, Repository } from 'typeorm';
import type { ProfilePictureStorageService } from '../../storage/profile-picture-storage.service';
import type { Student } from '../entities/student.entity';
import { StudentsService } from './students.service';

function serviceWithTransaction(query: jest.Mock) {
  const dataSource = {
    transaction: (work: (manager: { query: jest.Mock }) => unknown) =>
      work({ query }),
  } as unknown as DataSource;
  return new StudentsService(
    {} as Repository<Student>,
    dataSource,
    {} as ProfilePictureStorageService,
  );
}

function serviceWithQueries(query: jest.Mock) {
  return new StudentsService(
    {} as Repository<Student>,
    { query } as unknown as DataSource,
    {} as ProfilePictureStorageService,
  );
}

const ongoingAssignment = {
  internship_assignment_id: 4,
  assignment_status: 'ongoing',
  start_date: '2020-01-01',
  working_days: [5],
};

describe('StudentsService finalized attendance mutations', () => {
  it('allows an early Clock In and stores the actual server-derived Manila time', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([ongoingAssignment])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          attendance_record_id: 10,
          attendance_status: 'present',
          time_in: '07:45:00',
        },
      ]);
    const result = await serviceWithTransaction(query).timeInDtr(
      7,
      {
        internshipAssignmentId: 4,
      },
      new Date('2026-09-03T23:45:00.000Z'),
    );
    expect(result).toMatchObject({
      attendance_status: 'present',
      time_in: '07:45:00',
    });
    expect(String(query.mock.calls[2][0])).not.toContain('ON CONFLICT');
  });

  it.each([
    'pending',
    'complete_company',
    'complete_student',
    'withdrawn',
    'cancelled',
    'finalized',
  ])('rejects Clock In for %s', async (assignmentStatus) => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        { ...ongoingAssignment, assignment_status: assignmentStatus },
      ]);
    await expect(
      serviceWithTransaction(query).timeInDtr(7, {
        internshipAssignmentId: 4,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a non-working day and a duplicate/Absent/Incomplete/final row', async () => {
    const nonWorkday = jest
      .fn()
      .mockResolvedValueOnce([{ ...ongoingAssignment, working_days: [1] }]);
    await expect(
      serviceWithTransaction(nonWorkday).timeInDtr(7, {
        internshipAssignmentId: 4,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    for (const attendance_status of ['present', 'absent', 'incomplete']) {
      const duplicate = jest
        .fn()
        .mockResolvedValueOnce([ongoingAssignment])
        .mockResolvedValueOnce([{ attendance_status }]);
      await expect(
        serviceWithTransaction(duplicate).timeInDtr(7, {
          internshipAssignmentId: 4,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('clocks out only an open Present row and never upserts or overwrites a completed row', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([ongoingAssignment])
      .mockResolvedValueOnce([
        {
          attendance_record_id: 10,
          attendance_status: 'present',
          time_in: '07:45:00',
          time_out: null,
        },
      ])
      .mockResolvedValueOnce([
        {
          attendance_record_id: 10,
          time_out: '18:00:00',
          rendered_minutes: 555,
        },
      ]);
    await expect(
      serviceWithTransaction(query).timeOutDtr(
        7,
        {
          internshipAssignmentId: 4,
        },
        new Date('2026-09-04T10:00:00.000Z'),
      ),
    ).resolves.toMatchObject({ rendered_minutes: 555 });
    expect(String(query.mock.calls[2][0])).toContain(
      "attendance_status = 'present'",
    );
  });

  it.each([undefined, 'absent', 'incomplete', 'closed-present'])(
    'rejects Clock Out without an eligible open row (%s)',
    async (shape) => {
      const record =
        shape === undefined
          ? []
          : [
              {
                attendance_record_id: 10,
                attendance_status:
                  shape === 'closed-present' ? 'present' : shape,
                time_in: shape === 'absent' ? null : '08:00',
                time_out: shape === 'closed-present' ? '17:00' : null,
              },
            ];
      const query = jest
        .fn()
        .mockResolvedValueOnce([ongoingAssignment])
        .mockResolvedValueOnce(record);
      await expect(
        serviceWithTransaction(query).timeOutDtr(7, {
          internshipAssignmentId: 4,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    },
  );
});

describe('StudentsService assignment Attendance History', () => {
  it('enforces assignment ownership and server-paginates combined status/date filters', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([
        {
          internship_assignment_id: 4,
          assignment_status: 'finalized',
          required_minutes: 480,
          start_date: '2026-09-01',
          expected_end_date: '2026-09-30',
          ended_at: '2026-09-20T08:00:00.000Z',
          working_days: [1, 3, 5],
          start_shift: '08:00:00',
          end_shift: '17:00:00',
          job_title: 'Developer Intern',
          company_name: 'Acme',
          rendered_minutes: 555,
          days_present: 1,
          days_absent: 2,
        },
      ])
      .mockResolvedValueOnce([{ total: 11 }])
      .mockResolvedValueOnce([
        {
          attendanceRecordId: 8,
          date: '2026-09-04',
          timeIn: null,
          timeOut: null,
          renderedMinutes: 0,
          status: 'absent',
        },
      ]);

    const result = await serviceWithQueries(query).getStudentAttendanceHistory(
      7,
      4,
      {
        status: 'absent',
        date: '2026-09-04',
        page: 2,
        limit: 10,
      },
    );

    expect(result.assignment).toMatchObject({
      internshipAssignmentId: 4,
      assignmentStatus: 'finalized',
    });
    expect(result.summary).toEqual({
      daysPresent: 1,
      daysAbsent: 2,
      renderedMinutes: 555,
      remainingMinutes: 0,
    });
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 11,
      totalPages: 2,
    });
    expect(query.mock.calls[0][1]).toEqual([4, 7]);
    expect(query.mock.calls[2][1]).toEqual([4, 'absent', '2026-09-04', 10, 10]);
    expect(String(query.mock.calls[2][0])).toContain('LIMIT $4 OFFSET $5');
  });

  it('rejects Attendance History for an assignment not owned by the Student', async () => {
    const query = jest.fn().mockResolvedValueOnce([]);

    await expect(
      serviceWithQueries(query).getStudentAttendanceHistory(7, 99, {
        page: 1,
        limit: 5,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
