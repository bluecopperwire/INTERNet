import request from 'supertest';
import { seedReferenceData } from '../../src/database/seeds/reference.seed';
import { EmployerE2eEnvironment } from '../employer/support/employer-e2e-environment';

describe('Student signup and internship preference profile flow (e2e)', () => {
  const env = new EmployerE2eEnvironment();
  let token: string;
  let studentId: number;
  let standardIndustryId: number;
  let customIndustryId: number;

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const signupPayload = {
    email: 'student-profile-e2e@example.test',
    password: 'StudentPassword123',
    firstName: 'Ana',
    lastName: 'Student',
    sex: 'female',
    birthDate: '2004-05-06',
    contactNumber: '09123456789',
    addressLine: '1 Test Street',
    addressBarangay: 'Test Barangay',
    addressDistrict: 'District 1',
    addressCity: 'Quezon City',
    inquiryMethod: 'online',
  };
  const completeProfile = {
    firstName: signupPayload.firstName,
    lastName: signupPayload.lastName,
    sex: signupPayload.sex,
    birthDate: signupPayload.birthDate,
    contactNumber: signupPayload.contactNumber,
    contactEmail: signupPayload.email,
    addressLine: signupPayload.addressLine,
    addressBarangay: signupPayload.addressBarangay,
    addressDistrict: signupPayload.addressDistrict,
    addressCity: signupPayload.addressCity,
    inquiryMethod: signupPayload.inquiryMethod,
    academic: {
      schoolName: 'Quezon City University',
      yearLevel: 'fourth_year_college',
      strandProgram: 'BS Information Technology',
    },
  };
  const completePreference = {
    requiredHours: 400,
    availableDays: 'weekends',
    allowsOutsidePreferredField: false,
    startDate: '2099-01-01',
    preferredCompanyType: 'private',
  };

  beforeAll(async () => {
    await env.start();
    await seedReferenceData(env.dataSource);

    const signup = await request(env.app.getHttpServer())
      .post('/auth/signup')
      .send(signupPayload)
      .expect(201);
    token = signup.body.accessToken;

    const me = await request(env.app.getHttpServer())
      .get('/auth/me')
      .set(auth())
      .expect(200);
    studentId = me.body.studentId;

    const industries: Array<{
      industry_id: number;
      industry_name: string;
      is_custom_text: boolean;
    }> = await env.dataSource.query(
      `SELECT industry_id, industry_name, is_custom_text FROM public.industry`,
    );
    standardIndustryId = Number(
      industries.find(
        (industry) => industry.industry_name === 'Information Technology',
      )?.industry_id,
    );
    customIndustryId = Number(
      industries.find((industry) => industry.is_custom_text)?.industry_id,
    );
  }, 180_000);

  afterAll(async () => {
    await env.stop();
  });

  it('persists signup sex and returns blank internship preferences for a new student', async () => {
    const stored = await env.dataSource.query(
      `SELECT sex FROM public.student WHERE student_id = $1`,
      [studentId],
    );
    expect(stored[0].sex).toBe('female');

    const profile = await request(env.app.getHttpServer())
      .get(`/students/${studentId}/profile`)
      .set(auth())
      .expect(200);
    expect(profile.body.student.sex).toBe('female');
    expect(profile.body.internshipPreference).toBeNull();
    expect(profile.body.preferredIndustries).toEqual([]);

    const preferenceRows = await env.dataSource.query(
      `SELECT * FROM public.internship_preference WHERE student_id = $1`,
      [studentId],
    );
    expect(preferenceRows).toEqual([]);
  });

  it('rejects an incomplete internship preference section', async () => {
    await request(env.app.getHttpServer())
      .post(`/students/${studentId}/profile`)
      .set(auth())
      .send({
        ...completeProfile,
        internshipPreference: {
          ...completePreference,
          availableDays: '',
          allowsOutsidePreferredField: null,
        },
        preferredIndustries: [{ industryId: standardIndustryId }],
      })
      .expect(400);
  });

  it('saves and reloads complete non-custom internship preferences', async () => {
    const saved = await request(env.app.getHttpServer())
      .post(`/students/${studentId}/profile`)
      .set(auth())
      .send({
        ...completeProfile,
        internshipPreference: completePreference,
        preferredIndustries: [{ industryId: standardIndustryId }],
      })
      .expect(200);

    expect(saved.body.internshipPreference).toMatchObject({
      required_hours: 400,
      available_days: 'weekends',
      allows_outside_preferred_field: false,
      preferred_company_type: 'private',
    });
    expect(saved.body.preferredIndustries).toEqual([
      expect.objectContaining({ industry_id: standardIndustryId }),
    ]);
  });

  it('saves and reloads Other with custom text', async () => {
    const saved = await request(env.app.getHttpServer())
      .post(`/students/${studentId}/profile`)
      .set(auth())
      .send({
        ...completeProfile,
        internshipPreference: completePreference,
        preferredIndustries: [
          {
            industryId: customIndustryId,
            customIndustryName: 'Software Development',
          },
        ],
      })
      .expect(200);

    expect(saved.body.preferredIndustries).toEqual([
      expect.objectContaining({
        industry_id: customIndustryId,
        industry_name: 'Other',
        custom_industry_name: 'Software Development',
      }),
    ]);

    const reloaded = await request(env.app.getHttpServer())
      .get(`/students/${studentId}/profile`)
      .set(auth())
      .expect(200);
    expect(reloaded.body.preferredIndustries[0]).toMatchObject({
      industry_name: 'Other',
      custom_industry_name: 'Software Development',
    });
  });

  it('rejects Other without custom text and preserves the prior selection', async () => {
    await request(env.app.getHttpServer())
      .post(`/students/${studentId}/profile`)
      .set(auth())
      .send({
        ...completeProfile,
        internshipPreference: completePreference,
        preferredIndustries: [
          { industryId: customIndustryId, customIndustryName: '   ' },
        ],
      })
      .expect(400);

    const rows = await env.dataSource.query(
      `SELECT industry_id, custom_industry_name
       FROM public.student_preferred_industry
       WHERE student_id = $1`,
      [studentId],
    );
    expect(rows).toEqual([
      {
        industry_id: customIndustryId,
        custom_industry_name: 'Software Development',
      },
    ]);
  });

  it('clears stale custom text when Other is unchecked', async () => {
    await request(env.app.getHttpServer())
      .post(`/students/${studentId}/profile`)
      .set(auth())
      .send({
        ...completeProfile,
        internshipPreference: completePreference,
        preferredIndustries: [{ industryId: standardIndustryId }],
      })
      .expect(200);

    const rows = await env.dataSource.query(
      `SELECT spi.industry_id, spi.custom_industry_name, i.is_custom_text
       FROM public.student_preferred_industry spi
       JOIN public.industry i ON i.industry_id = spi.industry_id
       WHERE spi.student_id = $1`,
      [studentId],
    );
    expect(rows).toEqual([
      {
        industry_id: standardIndustryId,
        custom_industry_name: null,
        is_custom_text: false,
      },
    ]);
  });
});
