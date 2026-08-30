import { JwtService } from '@nestjs/jwt';
import type { DataSource, EntityManager } from 'typeorm';
import { seedReferenceData } from '../../../src/database/seeds/reference.seed';

export type Role = 'student' | 'company' | 'peso_personnel' | 'admin';
export type Status = 'active' | 'suspended' | 'archived';
export type AccountFixture = {
  accountId: number;
  email: string;
  token: string;
};
export type StudentFixture = AccountFixture & { studentId: number };
export type CompanyFixture = AccountFixture & { companyId: number };
export type PesoFixture = AccountFixture & { pesoPersonnelId: number };

export class AdminFixtureFactory {
  private serial = 0;
  private readonly jwt = new JwtService({ secret: 'admin-e2e-access-secret' });

  constructor(private readonly db: DataSource) {}

  async seedReference(): Promise<void> {
    await seedReferenceData(this.db);
    await this.db.query(
      `INSERT INTO public.industry (industry_name, is_custom_text) VALUES ('Other (please specify)', true)`,
    );
  }

  token(accountId: number, role: Role): string {
    return this.jwt.sign({
      sub: accountId,
      role,
      family: '10000000-0000-4000-8000-000000000001',
      type: 'access',
    });
  }

  async admin(): Promise<AccountFixture> {
    return this.db.transaction(async (manager) => {
      const account = await this.insertAccount(manager, 'admin', 'active');
      return { ...account, token: this.token(account.accountId, 'admin') };
    });
  }

  async student(label: string, status: Status): Promise<StudentFixture> {
    const n = ++this.serial;
    return this.db.transaction(async (manager) => {
      const account = await this.insertAccount(
        manager,
        'student',
        status,
        `student-${label}-${n}@test.invalid`,
      );
      const rows = await manager.query(
        `INSERT INTO public.student
          (user_account_id, first_name, middle_name, last_name, sex, birth_date, contact_number,
           contact_email, linkedin_url, address_line, address_barangay, address_district, address_city,
           inquiry_method, photo_file_path)
         VALUES ($1,$2,'Middle',$3,'Female','2002-01-01','09170000000',$4,$5,
           '1 Student Street','Central','District 1','Quezon City','online','students/photo.png')
         RETURNING student_id`,
        [
          account.accountId,
          label,
          `Learner${n}`,
          `contact-student-${n}@test.invalid`,
          `https://linkedin.com/in/student-${n}`,
        ],
      );
      const studentId = Number(rows[0].student_id);
      await manager.query(
        `INSERT INTO public.student_academic_information (student_id, school_name, year_level, strand_program)
         VALUES ($1,'E2E University','fourth_year_college','BS Information Technology')`,
        [studentId],
      );
      await manager.query(
        `INSERT INTO public.internship_preference
          (student_id, required_hours, available_days, allows_outside_preferred_field, start_date, preferred_company_type)
         VALUES ($1,400,'weekdays',true,CURRENT_DATE,'private')`,
        [studentId],
      );
      await manager.query(
        `INSERT INTO public.student_preferred_industry (student_id, industry_id)
         VALUES ($1,(SELECT industry_id FROM public.industry WHERE industry_name='Information Technology'))`,
        [studentId],
      );
      return {
        ...account,
        studentId,
        token: this.token(account.accountId, 'student'),
      };
    });
  }

  async company(label: string, status: Status): Promise<CompanyFixture> {
    const n = ++this.serial;
    return this.db.transaction(async (manager) => {
      const account = await this.insertAccount(
        manager,
        'company',
        status,
        `company-${label}-${n}@test.invalid`,
      );
      const rows = await manager.query(
        `INSERT INTO public.company
          (user_account_id, industry_id, company_name, company_type, description, website_url,
           year_established, company_size, contact_email, contact_number, contact_person_first_name,
           contact_person_last_name, address_line, address_barangay, address_district, address_city, logo_file_path)
         VALUES ($1,(SELECT industry_id FROM public.industry WHERE industry_name='Information Technology'),
           $2,'private','Company description','https://company.test',2015,250,$3,'09171111111',
           'Casey','Employer','2 Company Street','Central','District 2','Quezon City','logos/company.png')
         RETURNING company_id`,
        [
          account.accountId,
          `${label} Technologies ${n}`,
          `contact-company-${n}@test.invalid`,
        ],
      );
      return {
        ...account,
        companyId: Number(rows[0].company_id),
        token: this.token(account.accountId, 'company'),
      };
    });
  }

  async peso(label: string, status: Status): Promise<PesoFixture> {
    const n = ++this.serial;
    return this.db.transaction(async (manager) => {
      const account = await this.insertAccount(
        manager,
        'peso_personnel',
        status,
        `peso-${label}-${n}@test.invalid`,
      );
      const rows = await manager.query(
        `INSERT INTO public.peso_personnel
          (user_account_id, first_name, middle_name, last_name, sex, birth_date, address_line,
           address_barangay, address_district, address_city, contact_number, contact_email,
           employee_id, position, department, photo_file_path)
         VALUES ($1,$2,'Middle',$3,'Female','1990-01-01','3 PESO Street','Central','District 3',
           'Quezon City','09172222222',$4,$5,'Employment Officer','Internship Division',
           'peso/photo.png')
         RETURNING peso_personnel_id`,
        [
          account.accountId,
          label,
          `Officer${n}`,
          `contact-peso-${n}@test.invalid`,
          `QCPESO-${n}`,
        ],
      );
      return {
        ...account,
        pesoPersonnelId: Number(rows[0].peso_personnel_id),
        token: this.token(account.accountId, 'peso_personnel'),
      };
    });
  }

  private async insertAccount(
    manager: EntityManager,
    role: Role,
    status: Status,
    email = `${role}-${++this.serial}@test.invalid`,
  ): Promise<{ accountId: number; email: string }> {
    const rows = await manager.query(
      `INSERT INTO public.user_account (email, user_role, account_status, deleted_at, suspended_until)
       VALUES ($1,$2,$3::public.account_status_enum,
         CASE WHEN $3::public.account_status_enum = 'archived' THEN CURRENT_TIMESTAMP ELSE NULL END,
         CASE WHEN $3::public.account_status_enum = 'suspended'
           THEN CURRENT_TIMESTAMP + INTERVAL '7 days' ELSE NULL END)
       RETURNING user_account_id`,
      [email, role, status],
    );
    const accountId = Number(rows[0].user_account_id);
    await manager.query(
      `INSERT INTO public.local_authentication_credential (user_account_id, password_hash)
       VALUES ($1,'unused-admin-e2e-hash')`,
      [accountId],
    );
    return { accountId, email };
  }
}
