import { describe, expect, it } from 'vitest';
import { formatPreferredIndustries } from './preferred-industry-display';

describe('preferred industry display', () => {
  it('replaces Other with the custom field value', () => {
    expect(
      formatPreferredIndustries(
        ['Information Technology', 'Other'],
        'Software Development',
      ),
    ).toBe('Information Technology, Software Development');
  });

  it('keeps Other when no custom value is available', () => {
    expect(formatPreferredIndustries(['Other'], '')).toBe('Other');
  });
});
