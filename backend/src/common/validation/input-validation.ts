import { IsIn, Matches, type ValidationOptions } from 'class-validator';

export const DISTRICT_OPTIONS = [
  'District 1',
  'District 2',
  'District 3',
  'District 4',
  'District 5',
  'District 6',
  'N/A',
] as const;
export const DISTRICT_MESSAGE =
  'District must be one of District 1 through District 6, or N/A';

export const CONTACT_NUMBER_PATTERN =
  /^(?:09(?:[()\-\s]*\d){9}|\+63[()\-\s]*9(?:[()\-\s]*\d){9})$/;
export const CONTACT_NUMBER_MESSAGE =
  'Enter a valid Philippine mobile number: 11 digits starting with 09, or +63 followed by 10 digits starting with 9';

export const STRONG_PASSWORD_PATTERN =
  /^(?=[\s\S]{8,}$)(?=[\s\S]*[A-Z])(?=[\s\S]*[a-z])(?=[\s\S]*\d)(?=[\s\S]*[^A-Za-z0-9\s])[\s\S]*$/;
export const STRONG_PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character';

export function IsValidContactNumber(options?: ValidationOptions) {
  return Matches(CONTACT_NUMBER_PATTERN, {
    message: CONTACT_NUMBER_MESSAGE,
    ...options,
  });
}

export function IsStrongPassword(options?: ValidationOptions) {
  return Matches(STRONG_PASSWORD_PATTERN, {
    message: STRONG_PASSWORD_MESSAGE,
    ...options,
  });
}

export function IsValidDistrict(options?: ValidationOptions) {
  return IsIn(DISTRICT_OPTIONS, {
    message: DISTRICT_MESSAGE,
    ...options,
  });
}
