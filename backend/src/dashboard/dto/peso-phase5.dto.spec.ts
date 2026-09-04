import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  QcAttendanceListQueryDto,
  QcInternshipListQueryDto,
  QueryApplicationsDto,
  QueryReferralsDto,
} from './peso-dashboard.dto';

describe('Phase 5 workflow pagination DTOs', () => {
  it.each([5, 10, 15])('accepts approved page size %s', async (limit) => {
    for (const Type of [
      QcAttendanceListQueryDto,
      QcInternshipListQueryDto,
      QueryApplicationsDto,
      QueryReferralsDto,
    ]) {
      expect(await validate(plainToInstance(Type, { limit }))).toHaveLength(0);
    }
  });

  it.each([1, 7, 20, 100])('rejects unapproved page size %s', async (limit) => {
    const dto = plainToInstance(QcInternshipListQueryDto, { limit });
    expect((await validate(dto)).map((error) => error.property)).toContain(
      'limit',
    );
  });
});
