export const CONTACT_NUMBER_REQUIREMENTS =
  'Enter a valid Philippine mobile number: 11 digits starting with 09, or +63 followed by 10 digits starting with 9.';

export const CONTACT_NUMBER_PLACEHOLDER =
  'e.g., 09123456789 or +63 912 345 6789';

export const PASSWORD_REQUIREMENTS =
  'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.';

const CONTACT_NUMBER_CHARACTERS = /^\+?[0-9()\-\s]+$/;
const PHILIPPINE_MOBILE_NUMBER = /^(?:09\d{9}|\+639\d{9})$/;

export function getContactNumberError(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return 'Contact number is required.';
  if (!CONTACT_NUMBER_CHARACTERS.test(normalized)) return CONTACT_NUMBER_REQUIREMENTS;

  const compactNumber = normalized.replace(/[()\-\s]/g, '');
  return PHILIPPINE_MOBILE_NUMBER.test(compactNumber)
    ? null
    : CONTACT_NUMBER_REQUIREMENTS;
}

export function sanitizeContactNumberInput(value: string): string {
  const withoutInvalidCharacters = value.replace(/[^0-9()+\-\s]/g, '');
  return withoutInvalidCharacters.replace(/(?!^)\+/g, '');
}

export function getPasswordError(value: string, label = 'Password'): string | null {
  if (value.length < 8) return `${label} must be at least 8 characters.`;
  if (!/[A-Z]/.test(value)) return `${label} must include at least one uppercase letter.`;
  if (!/[a-z]/.test(value)) return `${label} must include at least one lowercase letter.`;
  if (!/\d/.test(value)) return `${label} must include at least one number.`;
  if (!/[^A-Za-z0-9\s]/.test(value)) return `${label} must include at least one special character.`;
  return null;
}
