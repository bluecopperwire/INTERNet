import { describe, expect, it } from 'vitest';
import {
  getContactNumberError,
  getPasswordError,
  sanitizeContactNumberInput,
} from './input-validation';

describe('contact number validation', () => {
  it.each(['09123456789', '+63 912 345 6789'])('accepts %s', (value) => {
    expect(getContactNumberError(value)).toBeNull();
  });

  it.each(['12345', '099999999999', '0912-ABC-7890', '++639123456789', '(02) 8123-4567'])('rejects %s', (value) => {
    expect(getContactNumberError(value)).not.toBeNull();
  });

  it('removes unsupported characters and extra plus signs', () => {
    expect(sanitizeContactNumberInput('+63a 912+345')).toBe('+63 912345');
  });
});

describe('password validation', () => {
  it('accepts a password that satisfies every requirement', () => {
    expect(getPasswordError('Password1!')).toBeNull();
  });

  it.each([
    ['Pass1!', 'Password must be at least 8 characters.'],
    ['password1!', 'Password must include at least one uppercase letter.'],
    ['PASSWORD1!', 'Password must include at least one lowercase letter.'],
    ['Password!', 'Password must include at least one number.'],
    ['Password1', 'Password must include at least one special character.'],
  ])('returns the appropriate error for %s', (value, expected) => {
    expect(getPasswordError(value)).toBe(expected);
  });
});
