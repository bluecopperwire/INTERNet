import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignupDto } from './signup.dto';

const validSignup = {
  email: 'student@example.test',
  password: 'Password123!',
  firstName: 'Test',
  lastName: 'Student',
  sex: 'female',
  birthDate: '2002-01-01',
  contactNumber: '09123456789',
  addressLine: '1 Test Street',
  addressBarangay: 'Central',
  addressDistrict: '1',
  addressCity: 'Quezon City',
  inquiryMethod: 'online',
};

describe('SignupDto', () => {
  it('accepts every supported inquiry method', async () => {
    for (const inquiryMethod of ['walk_in', 'online', 'phone_call', 'school']) {
      const dto = plainToInstance(SignupDto, { ...validSignup, inquiryMethod });
      await expect(validate(dto)).resolves.toHaveLength(0);
    }
  });

  it('rejects unsupported sex and inquiry values', async () => {
    const dto = plainToInstance(SignupDto, {
      ...validSignup,
      sex: 'prefer_not_to_say',
      inquiryMethod: 'social_media',
    });
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['sex', 'inquiryMethod']),
    );
  });

  it.each(['password1!', 'PASSWORD1!', 'Password!', 'Password1', 'Pass1!'])(
    'rejects a password that does not meet every strength rule: %s',
    async (password) => {
      const errors = await validate(
        plainToInstance(SignupDto, { ...validSignup, password }),
      );
      expect(errors.some((error) => error.property === 'password')).toBe(true);
    },
  );

  it.each(['12345', '099999999999', '0912-ABC-7890', '++639123456789'])(
    'rejects an invalid contact number: %s',
    async (contactNumber) => {
      const errors = await validate(
        plainToInstance(SignupDto, { ...validSignup, contactNumber }),
      );
      expect(errors.some((error) => error.property === 'contactNumber')).toBe(
        true,
      );
    },
  );

  it('accepts a formatted international contact number', async () => {
    const dto = plainToInstance(SignupDto, {
      ...validSignup,
      contactNumber: '+63 912 345 6789',
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
