import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AttendanceHistoryQueryDto,
  AttendanceListQueryDto,
  InternshipHistoryQueryDto,
  InternshipListQueryDto,
} from './index';

describe('Employer Phase 4 query DTOs', () => {
  it.each([5, 10, 15])(
    'accepts supported backend page size %s',
    async (limit) => {
      const dto = plainToInstance(InternshipListQueryDto, { page: 1, limit });
      expect(await validate(dto)).toHaveLength(0);
    },
  );

  it.each([1, 7, 20, 100])(
    'rejects unsupported page size %s',
    async (limit) => {
      const dto = plainToInstance(AttendanceListQueryDto, { page: 1, limit });
      expect((await validate(dto)).map((error) => error.property)).toContain(
        'limit',
      );
    },
  );

  it('keeps Awaiting Completion valid only for the Manage query', async () => {
    const manage = plainToInstance(InternshipListQueryDto, {
      status: 'awaiting_completion',
    });
    const history = plainToInstance(InternshipHistoryQueryDto, {
      status: 'awaiting_completion',
    });
    expect(await validate(manage)).toHaveLength(0);
    expect((await validate(history)).map((error) => error.property)).toContain(
      'status',
    );
  });

  it('keeps Pending monitor-only and rejects it for persisted history', async () => {
    const monitor = plainToInstance(AttendanceListQueryDto, {
      status: 'pending',
    });
    const history = plainToInstance(AttendanceHistoryQueryDto, {
      status: 'pending',
    });
    expect(await validate(monitor)).toHaveLength(0);
    expect((await validate(history)).map((error) => error.property)).toContain(
      'status',
    );
  });
});
