const YEAR_LEVEL_LABELS: Record<string, string> = {
  grade_11: 'Grade 11',
  grade_12: 'Grade 12',
  first_year_college: 'First Year College',
  second_year_college: 'Second Year College',
  third_year_college: 'Third Year College',
  fourth_year_college: 'Fourth Year College',
  fifth_year_college: 'Fifth Year College',
  first_year: 'First Year College',
  second_year: 'Second Year College',
  third_year: 'Third Year College',
  fourth_year: 'Fourth Year College',
  fifth_year: 'Fifth Year College',
  '1st_year': 'First Year College',
  '2nd_year': 'Second Year College',
  '3rd_year': 'Third Year College',
  '4th_year': 'Fourth Year College',
  '5th_year': 'Fifth Year College',
};

const LEGACY_YEAR_LEVEL_LABELS: Record<string, string> = {
  '1st year': 'First Year College',
  '2nd year': 'Second Year College',
  '3rd year': 'Third Year College',
  '4th year': 'Fourth Year College',
  '5th year': 'Fifth Year College',
};

export function formatYearLevel(value?: string | null, fallback = 'N/A'): string {
  const normalized = value?.trim();
  if (!normalized) return fallback;
  if (normalized.toUpperCase() === 'N/A') return 'N/A';

  const key = normalized.toLowerCase().replace(/[\s-]+/g, '_');
  if (YEAR_LEVEL_LABELS[key]) return YEAR_LEVEL_LABELS[key];

  const legacyKey = normalized.toLowerCase();
  if (LEGACY_YEAR_LEVEL_LABELS[legacyKey]) return LEGACY_YEAR_LEVEL_LABELS[legacyKey];

  return normalized
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
