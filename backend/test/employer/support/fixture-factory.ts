import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { JwtService } from '@nestjs/jwt';
import type { DataSource, EntityManager } from 'typeorm';
import { seedReferenceData } from '../../../src/database/seeds/reference.seed';

type Role = 'company' | 'student' | 'admin' | 'peso_personnel';
type ResponseState = 'pending' | 'for_interview' | 'accepted' | 'rejected';
type StudentResponse = 'pending' | 'accepted' | 'declined';
type AssignmentState =
  'pending' | 'ongoing' | 'completed' | 'cancelled' | 'withdrawn';

export type CompanyFixture = {
  accountId: number;
  companyId: number;
  token: string;
};
export type StudentFixture = {
  accountId: number;
  studentId: number;
  token: string;
  name: string;
};
export type ReferralFixture = {
  opportunityId: number;
  applicationId: number;
  referralId: number;
  student: StudentFixture;
};

export class EmployerFixtureFactory {
  private serial = 0;
  readonly jwt = new JwtService({ secret: 'employer-e2e-access-secret' });

  constructor(
    readonly db: DataSource,
    readonly documentRoot: string,
  ) {}

  async seedReference(): Promise<void> {
    await seedReferenceData(this.db);
    await this.db.query(
      `INSERT INTO public.industry (industry_name, is_custom_text)
       VALUES ('Other (please specify)', true)`,
    );
    await this.db.query(
      `INSERT INTO public.requirement_type (requirement_type_name)
       VALUES ('Resume'), ('Letter of Intent')`,
    );
  }

  token(accountId: number, role: Exclude<Role, 'peso_personnel'>): string {
    return this.jwt.sign({
      sub: accountId,
      role,
      family: '00000000-0000-4000-8000-000000000001',
      type: 'access',
    });
  }

  async company(label = 'A'): Promise<CompanyFixture> {
    const n = ++this.serial;
    return this.db.transaction(async (m) => {
      const accountId = await this.insertAccount(
        m,
        `company-${label}-${n}@test.invalid`,
        'company',
      );
      const rows = await m.query(
        `INSERT INTO public.company
          (user_account_id, industry_id, company_name, company_type, description,
           website_url, year_established, company_size, contact_email, contact_number,
           contact_person_first_name, contact_person_last_name, address_line,
           address_barangay, address_district, address_city, logo_file_path)
         VALUES ($1, (SELECT industry_id FROM public.industry WHERE industry_name='Information Technology'),
           $2, 'private', 'E2E company description', 'https://example.test', 2018, 25,
           $3, '09170000000', 'Casey', 'Employer', '1 Test Street', 'Central',
           'District 1', 'Quezon City', $4)
         RETURNING company_id`,
        [
          accountId,
          `Company ${label} ${n}`,
          `contact-${n}@test.invalid`,
          `logos/old-${n}.png`,
        ],
      );
      return {
        accountId,
        companyId: Number(rows[0].company_id),
        token: this.token(accountId, 'company'),
      };
    });
  }

  async student(label = 'Student'): Promise<StudentFixture> {
    const n = ++this.serial;
    return this.db.transaction(async (m) => {
      const accountId = await this.insertAccount(
        m,
        `student-${n}@test.invalid`,
        'student',
      );
      const rows = await m.query(
        `INSERT INTO public.student
          (user_account_id, first_name, last_name, sex, birth_date, contact_number,
           contact_email, address_line, address_barangay, address_district, address_city,
           inquiry_method, photo_file_path)
         VALUES ($1,$2,$3,'Prefer not to say','2002-01-01',$4,$5,'2 Test Street',
           'Central','District 1','Quezon City','online',$6)
         RETURNING student_id`,
        [
          accountId,
          label,
          `Learner${n}`,
          `0918${String(n).padStart(7, '0')}`,
          `student-${n}@test.invalid`,
          `students/${n}.png`,
        ],
      );
      const studentId = Number(rows[0].student_id);
      await m.query(
        `INSERT INTO public.student_academic_information (student_id, school_name, year_level, strand_program)
         VALUES ($1,'E2E University','fourth_year_college','BS Information Technology')`,
        [studentId],
      );
      await m.query(
        `INSERT INTO public.internship_preference
          (student_id, required_hours, available_days, allows_outside_preferred_field, start_date, preferred_company_type)
         VALUES ($1,400,'weekdays',true,CURRENT_DATE,'private')`,
        [studentId],
      );
      await m.query(
        `INSERT INTO public.student_preferred_industry (student_id, industry_id)
         VALUES ($1,(SELECT industry_id FROM public.industry WHERE industry_name='Information Technology'))`,
        [studentId],
      );
      return {
        accountId,
        studentId,
        token: this.token(accountId, 'student'),
        name: `${label} Learner${n}`,
      };
    });
  }

  async admin(): Promise<{ accountId: number; token: string }> {
    const n = ++this.serial;
    return this.db.transaction(async (m) => {
      const accountId = await this.insertAccount(
        m,
        `admin-${n}@test.invalid`,
        'admin',
      );
      return { accountId, token: this.token(accountId, 'admin') };
    });
  }

  async corruptCompanyAccountWithoutProfile(): Promise<{
    accountId: number;
    token: string;
  }> {
    const n = ++this.serial;
    const runner = this.db.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query('SET LOCAL session_replication_role = replica');
      const rows = await runner.query(
        `INSERT INTO public.user_account (email, user_role)
         VALUES ($1, 'company') RETURNING user_account_id`,
        [`orphan-company-${n}@test.invalid`],
      );
      const accountId = Number(rows[0].user_account_id);
      await runner.query(
        `INSERT INTO public.local_authentication_credential (user_account_id, password_hash)
         VALUES ($1, 'unused-e2e-hash')`,
        [accountId],
      );
      await runner.commitTransaction();
      return { accountId, token: this.token(accountId, 'company') };
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  async opportunity(
    companyId: number,
    options: Partial<{
      title: string;
      status: 'open' | 'closed' | 'archived';
      allowance: string | null;
      deadline: string;
      offeredSlots: number;
      requiredHours: number;
    }> = {},
  ): Promise<number> {
    const n = ++this.serial;
    const status = options.status ?? 'open';
    const rows = await this.db.query(
      `INSERT INTO public.opportunity
        (company_id,title,department,description,qualification,allowance,
         minimum_required_hours,work_arrangement,offered_slots,application_deadline,opportunity_status)
       VALUES ($1,$2,'Engineering','E2E opportunity','Qualified',$3,$4,'hybrid',$5,
         COALESCE($6::timestamptz, CURRENT_TIMESTAMP + INTERVAL '365 days'),$7)
       RETURNING opportunity_id`,
      [
        companyId,
        options.title ?? `Opportunity ${n}`,
        options.allowance ?? null,
        options.requiredHours ?? 80,
        options.offeredSlots ?? 2,
        options.deadline ?? null,
        status,
      ],
    );
    return Number(rows[0].opportunity_id);
  }

  async referral(
    companyId: number,
    options: Partial<{
      title: string;
      response: ResponseState;
      studentResponse: StudentResponse;
      studentLabel: string;
    }> = {},
  ): Promise<ReferralFixture> {
    const student = await this.student(options.studentLabel ?? 'E2E');
    const opportunityId = await this.opportunity(companyId, {
      title: options.title,
    });
    const appRows = await this.db.query(
      `INSERT INTO public.application (student_id, opportunity_id) VALUES ($1,$2) RETURNING application_id`,
      [student.studentId, opportunityId],
    );
    const applicationId = Number(appRows[0].application_id);
    await this.db.query(
      `UPDATE public.application SET application_status='under_review' WHERE application_id=$1`,
      [applicationId],
    );
    await this.db.query(
      `UPDATE public.application SET application_status='approved_for_referral' WHERE application_id=$1`,
      [applicationId],
    );
    const referralRows = await this.db
      .query(
        `INSERT INTO public.referral (application_id,peso_personnel_id,referral_document_file_path)
       VALUES ($1,1,$2) RETURNING referral_id`,
        [applicationId, `student-${student.studentId}/referral.pdf`],
      )
      .catch(async () => {
        await this.ensurePersonnel();
        return this.db.query(
          `INSERT INTO public.referral (application_id,peso_personnel_id,referral_document_file_path)
         VALUES ($1,1,$2) RETURNING referral_id`,
          [applicationId, `student-${student.studentId}/referral.pdf`],
        );
      });
    const referralId = Number(referralRows[0].referral_id);
    await this.setReferralState(referralId, options.response ?? 'pending');
    if ((options.studentResponse ?? 'pending') !== 'pending') {
      if ((options.response ?? 'pending') !== 'accepted')
        await this.setReferralState(referralId, 'accepted');
      await this.db.query(
        `UPDATE public.application SET student_response=$2, student_responded_at=CURRENT_TIMESTAMP WHERE application_id=$1`,
        [applicationId, options.studentResponse],
      );
      await this.db.query(
        `UPDATE public.referral SET referral_status='closed' WHERE referral_id=$1`,
        [referralId],
      );
      await this.db.query(
        `UPDATE public.application SET application_status='closed' WHERE application_id=$1`,
        [applicationId],
      );
    }
    return { opportunityId, applicationId, referralId, student };
  }

  async unreferredApplication(
    companyId: number,
    label = 'Unreferred',
  ): Promise<number> {
    const student = await this.student(label);
    const opportunityId = await this.opportunity(companyId, {
      title: `${label} Job`,
    });
    const rows = await this.db.query(
      `INSERT INTO public.application (student_id, opportunity_id) VALUES ($1,$2) RETURNING application_id`,
      [student.studentId, opportunityId],
    );
    return Number(rows[0].application_id);
  }

  async setReferralState(
    referralId: number,
    response: ResponseState,
  ): Promise<void> {
    if (response === 'pending') return;
    if (response === 'for_interview' || response === 'accepted') {
      await this.db.query(
        `UPDATE public.referral SET referral_status='under_review', company_response=$2,
          company_responded_at=CURRENT_TIMESTAMP WHERE referral_id=$1`,
        [referralId, response],
      );
    } else {
      await this.db.query(
        `UPDATE public.referral SET referral_status='under_review' WHERE referral_id=$1`,
        [referralId],
      );
      await this.db.query(
        `UPDATE public.referral SET referral_status='closed', company_response='rejected',
          company_responded_at=CURRENT_TIMESTAMP, remark='Not selected for this role.'
          WHERE referral_id=$1`,
        [referralId],
      );
      await this.db.query(
        `UPDATE public.application a SET application_status='closed'
         FROM public.referral r
         WHERE r.referral_id=$1 AND a.application_id=r.application_id`,
        [referralId],
      );
    }
  }

  async assignment(
    referralId: number,
    options: Partial<{
      status: AssignmentState;
      startDate: string;
      expectedEndDate: string | null;
      endDate: string | null;
      workingDays: 'weekdays' | 'weekends' | 'flexible';
      startShift: string;
      endShift: string;
      requiredHours: number;
      terminalChangedAt: string;
    }> = {},
  ): Promise<number> {
    const rows = await this.db.query(
      `INSERT INTO public.internship_assignment
        (referral_id,required_hours,start_date,expected_end_date,working_days,start_shift,end_shift)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING internship_assignment_id`,
      [
        referralId,
        options.requiredHours ?? 8,
        options.startDate ?? '2026-08-01',
        options.expectedEndDate ?? null,
        options.workingDays ?? 'weekdays',
        options.startShift ?? '08:00',
        options.endShift ?? '17:00',
      ],
    );
    const id = Number(rows[0].internship_assignment_id);
    const status = options.status ?? 'pending';
    if (status !== 'pending') {
      const runner = this.db.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      try {
        await runner.query('SET LOCAL session_replication_role = replica');
        await runner.query(
          `UPDATE public.internship_assignment SET assignment_status=$2, end_date=$3 WHERE internship_assignment_id=$1`,
          [
            id,
            status,
            status === 'completed'
              ? (options.endDate ?? '2026-08-20')
              : (options.endDate ?? null),
          ],
        );
        await runner.commitTransaction();
      } catch (error) {
        await runner.rollbackTransaction();
        throw error;
      } finally {
        await runner.release();
      }
      const previous = status === 'ongoing' ? 'pending' : 'ongoing';
      if (status !== 'ongoing') {
        await this.db.query(
          `INSERT INTO public.internship_assignment_status_history
            (internship_assignment_id,previous_assignment_status,new_assignment_status,changed_at)
           VALUES ($1,$2,$3,$4::timestamptz)`,
          [
            id,
            previous,
            status,
            options.terminalChangedAt ?? '2026-08-20T00:00:00+08:00',
          ],
        );
      }
    }
    return id;
  }

  async attendance(
    assignmentId: number,
    date: string,
    timeIn = '08:00',
    timeOut: string | null = '17:00',
    storedHours?: number,
  ): Promise<number> {
    const rows = await this.db.query(
      `INSERT INTO public.attendance_record
        (internship_assignment_id,attendance_date,time_in,time_out,time_in_status,hours_rendered,rendered_hours_status)
       VALUES ($1,$2,$3,$4,'on_time',$5,CASE WHEN $4::time IS NULL THEN 'incomplete'::public.rendered_hours_status_enum ELSE 'complete'::public.rendered_hours_status_enum END)
       RETURNING attendance_record_id`,
      [
        assignmentId,
        date,
        timeIn,
        timeOut,
        timeOut ? (storedHours ?? 99) : null,
      ],
    );
    return Number(rows[0].attendance_record_id);
  }

  async document(
    studentId: number,
    bytes = Buffer.from('employer-e2e-document'),
  ): Promise<number> {
    const typeRows = await this.db.query(
      `SELECT requirement_type_id FROM public.requirement_type ORDER BY requirement_type_id LIMIT 1`,
    );
    const filename = `student-${studentId}-resume.pdf`;
    const storedPath = `/uploads/requirements/${filename}`;
    const absolute = join(this.documentRoot, filename);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, bytes);
    const rows = await this.db.query(
      `INSERT INTO public.student_requirement_submission
        (requirement_type_id,student_id,requirement_name,requirement_file_path)
       VALUES ($1,$2,'Resume',$3) RETURNING student_requirement_submission_id`,
      [typeRows[0].requirement_type_id, studentId, storedPath],
    );
    return Number(rows[0].student_requirement_submission_id);
  }

  private async insertAccount(
    m: EntityManager,
    email: string,
    role: Role,
  ): Promise<number> {
    const rows = await m.query(
      `INSERT INTO public.user_account (email,user_role) VALUES ($1,$2) RETURNING user_account_id`,
      [email, role],
    );
    const id = Number(rows[0].user_account_id);
    await m.query(
      `INSERT INTO public.local_authentication_credential (user_account_id,password_hash) VALUES ($1,'unused-e2e-hash')`,
      [id],
    );
    return id;
  }

  private async ensurePersonnel(): Promise<void> {
    await this.db.transaction(async (m) => {
      const accountId = await this.insertAccount(
        m,
        `peso-${++this.serial}@test.invalid`,
        'peso_personnel',
      );
      await m.query(
        `INSERT INTO public.peso_personnel
          (user_account_id,first_name,last_name,sex,birth_date,address_line,address_barangay,address_district,
           address_city,contact_number,contact_email,employee_id,position,department)
         VALUES ($1,'Pat','Officer','N/A','1990-01-01','1 PESO','Central','D1','QC','0900','peso@test.invalid',
           'PESO-1','Officer','PESO')`,
        [accountId],
      );
    });
  }
}
