import 'reflect-metadata';
import { validate } from 'class-validator';
import {
  StudentAssignmentRemarkDto,
  StudentCompanyReviewDto,
} from './students.dto';
import { StudentInternshipHistoryQueryDto } from './student-attendance-query.dto';

describe('Student assignment workflow DTOs', () => {
  it('rejects a whitespace-only withdrawal reason', async () => {
    const dto = Object.assign(new StudentAssignmentRemarkDto(), {
      remark: '   ',
    });
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it.each([0, 1.5, 6])('rejects invalid review rating %s', async (rating) => {
    const dto = Object.assign(new StudentCompanyReviewDto(), {
      rating,
      remark: 'A valid review remark.',
    });
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });

  it('accepts an integer rating from 1 to 5 with a nonblank remark', async () => {
    const dto = Object.assign(new StudentCompanyReviewDto(), {
      rating: 5,
      remark: 'A valid review remark.',
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('accepts the supported internship history search and status filters', async () => {
    const dto = Object.assign(new StudentInternshipHistoryQueryDto(), {
      search: 'DevSeed',
      status: 'completed',
      page: 1,
      limit: 5,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects unsupported internship history statuses', async () => {
    const dto = Object.assign(new StudentInternshipHistoryQueryDto(), {
      status: 'under_review',
    });
    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
