import request from 'supertest';
import type { DataSource } from 'typeorm';
import { AdminE2eEnvironment } from './support/admin-e2e-environment';
import { AdminFixtureFactory, type PesoFixture } from './support/fixture-factory';

describe('PESO Create Employer endpoint', () => {
  const env = new AdminE2eEnvironment();
  let db: DataSource;
  let fixtures: AdminFixtureFactory;
  let peso: PesoFixture;

  beforeAll(async () => {
    await env.start();
    db = env.dataSource;
  });

  beforeEach(async () => {
    await env.resetDatabase();
    fixtures = new AdminFixtureFactory(db);
    await fixtures.seedReference();
    peso = await fixtures.peso('Officer', 'active');
  });

  afterAll(async () => env.stop());

  it('creates an employer when called by PESO personnel with optional fields omitted', async () => {
    const payload = {
      accountEmail: 'peso-created-employer@example.com',
      initialPassword: 'Password123!',
      companyName: 'PESO Partner Corp',
      companyType: 'private',
      industryId: 1,
      description: 'A partner company created by PESO.',
      addressLine: '100 Main St',
      addressBarangay: 'Central',
      addressCity: 'Quezon City',
      contactPersonFirstName: 'John',
      contactPersonLastName: 'Doe',
      contactEmail: 'contact@partner.com',
      contactNumber: '09123456789',
    };

    const res = await request(env.app.getHttpServer())
      .post('/dashboard/peso/employers')
      .set('Authorization', `Bearer ${peso.token}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      accountEmail: 'peso-created-employer@example.com',
      companyName: 'PESO Partner Corp',
    });

    const accounts = await db.query(
      'SELECT * FROM public.user_account WHERE email = $1',
      ['peso-created-employer@example.com'],
    );
    expect(accounts).toHaveLength(1);
    expect(accounts[0].user_role).toBe('company');
    expect(accounts[0].account_status).toBe('active');

    const companies = await db.query(
      'SELECT * FROM public.company WHERE user_account_id = $1',
      [accounts[0].user_account_id],
    );
    expect(companies).toHaveLength(1);
    expect(companies[0].company_name).toBe('PESO Partner Corp');
  });

  it('creates an employer with websiteUrl = null and district = null', async () => {
    const payload = {
      accountEmail: 'peso-created-employer-nulls@example.com',
      initialPassword: 'Password123!',
      companyName: 'Nulls Corp',
      companyType: 'government',
      industryId: 1,
      companySize: 50,
      yearEstablished: 2020,
      websiteUrl: null,
      description: 'Another partner company.',
      addressLine: '200 Main St',
      addressBarangay: 'Batasan',
      addressDistrict: null,
      addressCity: 'Quezon City',
      contactPersonFirstName: 'Jane',
      contactPersonMiddleName: null,
      contactPersonLastName: 'Smith',
      contactPersonExtensionName: null,
      contactEmail: 'jane@nulls.com',
      contactNumber: '09198765432',
    };

    const res = await request(env.app.getHttpServer())
      .post('/dashboard/peso/employers')
      .set('Authorization', `Bearer ${peso.token}`)
      .send(payload);

    expect(res.status).toBe(201);
  });
});
