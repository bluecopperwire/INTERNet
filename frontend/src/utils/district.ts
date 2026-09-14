export const DISTRICT_OPTIONS = [
  'District 1',
  'District 2',
  'District 3',
  'District 4',
  'District 5',
  'District 6',
  'N/A',
] as const;

export type DistrictOption = (typeof DISTRICT_OPTIONS)[number];

export function normalizeDistrictOption(value: unknown): DistrictOption | '' {
  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  if (/^n\s*\/?\s*a$/i.test(normalized)) return 'N/A';

  const district = normalized.match(/^(?:district\s*)?([1-6])$/i);
  return district ? `District ${district[1]}` as DistrictOption : '';
}

export function districtAddressPart(value: unknown): string | null {
  const normalized = normalizeDistrictOption(value);
  return normalized && normalized !== 'N/A' ? normalized : null;
}
