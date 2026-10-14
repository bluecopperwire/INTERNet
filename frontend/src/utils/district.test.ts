import { describe, expect, it } from 'vitest';
import { districtAddressPart, normalizeDistrictOption } from './district';

describe('district normalization', () => {
  it.each([
    ['1', 'District 1'],
    ['district 3', 'District 3'],
    ['District 6', 'District 6'],
    ['N/A', 'N/A'],
    ['n/a', 'N/A'],
  ])('normalizes %s to %s', (value, expected) => {
    expect(normalizeDistrictOption(value)).toBe(expected);
  });

  it('rejects values outside the supported choices', () => {
    expect(normalizeDistrictOption('District 7')).toBe('');
    expect(normalizeDistrictOption('')).toBe('');
  });

  it('omits N/A from displayed addresses', () => {
    expect(districtAddressPart('N/A')).toBeNull();
    expect(districtAddressPart('District 2')).toBe('District 2');
  });
});
