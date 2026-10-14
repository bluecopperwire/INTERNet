import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Opportunity catalog company profile fields', () => {
  const source = readFileSync(
    join(__dirname, 'opportunity-catalog.service.ts'),
    'utf8',
  );

  it('returns the company About description in list and detail responses', () => {
    expect(source.match(/c\.description AS company_description/g)).toHaveLength(
      2,
    );
    expect(
      source.match(/companyDescription: row\.company_description/g),
    ).toHaveLength(2);
  });
});
