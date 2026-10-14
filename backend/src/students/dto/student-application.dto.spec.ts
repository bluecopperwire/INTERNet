import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateStudentApplicationDto } from './students.dto';

describe('CreateStudentApplicationDto', () => {
  it('accepts an opportunity id without a student-authored remark', async () => {
    const dto = plainToInstance(CreateStudentApplicationDto, {
      opportunityId: 9,
    });

    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(0);
  });

  it('rejects the removed student application remark field', async () => {
    const dto = plainToInstance(CreateStudentApplicationDto, {
      opportunityId: 9,
      remark: 'Student cover note',
    });
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.map((error) => error.property)).toContain('remark');
  });
});
