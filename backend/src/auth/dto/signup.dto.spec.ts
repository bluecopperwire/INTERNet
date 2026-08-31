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
});
