import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InternshipPreferenceDto } from './students.dto';

describe('InternshipPreferenceDto availability days', () => {
  const preference = (availableDays: unknown) =>
    plainToInstance(InternshipPreferenceDto, {
      requiredHours: 400,
      availableDays,
      preferredCompanyType: 'private',
      startDate: '2099-01-01',
      allowsOutsidePreferredField: true,
    });

  it('accepts an exact non-contiguous day selection', async () => {
    await expect(validate(preference([1, 3, 4, 6]))).resolves.toHaveLength(0);
  });

  it.each([[], [1, 1], [-1, 2], [1, 7], ['1', 2], 'weekdays'])(
    'rejects an invalid availability selection (%j)',
    async (availableDays) => {
      expect(await validate(preference(availableDays))).not.toHaveLength(0);
    },
  );
});
