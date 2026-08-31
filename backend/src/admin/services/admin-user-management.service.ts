import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource, QueryRunner } from 'typeorm';
import { withStatusActor } from '../../database/status-actor.transaction';
import { AccountStatus, UserRole } from '../../users/entities/account.entities';
import {
  AdminListQueryDto,
  CreateAdminEmployerDto,
  CreateAdminPesoPersonnelDto,
  PreferredIndustryDto,
  UpdateAdminAccountStatusDto,
  UpdateAdminEmployerDto,
  UpdateAdminPesoPersonnelDto,
  UpdateAdminStudentDto,
} from '../dto/admin-user-management.dto';
import {
  assertValidDate,
  currentManilaDate,
} from '../../employer/utils/time.utils';

type SummaryRow = {
  total: string;
  active: string;
  suspended: string;
  archived: string;
};

@Injectable()
export class AdminUserManagementService {
  constructor(private readonly dataSource: DataSource) {}

  async listStudents(query: AdminListQueryDto) {
    const filter = this.listFilter(query, [
      `concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name)`,
      'ua.email',
    ]);
    const [summary, countRows, data]: [
      SummaryRow,
      Array<{ total: string }>,
      unknown[],
    ] = await Promise.all([
      this.summary(UserRole.STUDENT, 'student', 's'),
      this.dataSource.query(
        `SELECT count(*) AS total
         FROM public.user_account ua
         JOIN public.student s ON s.user_account_id = ua.user_account_id
         WHERE ua.user_role = 'student' ${filter.sql}`,
        filter.params,
      ),
      this.dataSource.query(
        `SELECT s.student_id AS "studentId", ua.user_account_id AS "userAccountId",
                concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS "fullName",
                ua.email AS "accountEmail", ua.created_at AS "createdAt",
                ua.account_status AS "accountStatus", ua.suspended_until AS "suspendedUntil"
         FROM public.user_account ua
         JOIN public.student s ON s.user_account_id = ua.user_account_id
         WHERE ua.user_role = 'student' ${filter.sql}
         ORDER BY ua.created_at DESC, s.student_id DESC
         LIMIT $${filter.params.length + 1} OFFSET $${filter.params.length + 2}`,
        [...filter.params, query.limit, (query.page - 1) * query.limit],
      ),
    ]);
    return this.listResponse(data, summary, countRows, query);
  }

  async getStudent(studentId: number) {
    this.assertPositiveId(studentId, 'studentId');
    const rows = await this.dataSource.query(
      `SELECT s.student_id AS "studentId", ua.user_account_id AS "userAccountId",
              ua.email AS "accountEmail", ua.account_status AS "accountStatus", ua.suspended_until AS "suspendedUntil", ua.created_at AS "createdAt",
              s.first_name AS "firstName", s.middle_name AS "middleName", s.last_name AS "lastName",
              s.extension_name AS "extensionName",
              concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS "fullName",
              s.birth_date::text AS "birthDate", s.sex,
              s.address_line AS "addressLine", s.address_barangay AS "addressBarangay",
              s.address_district AS "addressDistrict", s.address_city AS "addressCity",
              s.contact_email AS "contactEmail", s.contact_number AS "contactNumber",
              s.linkedin_url AS "linkedinUrl", s.photo_file_path AS "photoFilePath",
              s.updated_at AS "profileUpdatedAt",
              sai.school_name AS "schoolName", sai.year_level AS "yearLevel", sai.strand_program AS "strandProgram",
              ip.required_hours AS "requiredHours", ip.available_days AS "availableDays", ip.start_date::text AS "startDate",
              ip.preferred_company_type AS "preferredCompanyType",
              ip.allows_outside_preferred_field AS "allowsOutsidePreferredField"
       FROM public.student s
       JOIN public.user_account ua ON ua.user_account_id = s.user_account_id AND ua.user_role = 'student'
       LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
       LEFT JOIN public.internship_preference ip ON ip.student_id = s.student_id
       WHERE s.student_id = $1`,
      [studentId],
    );
    if (!rows.length) throw new NotFoundException('Student not found.');
    const preferredIndustries = await this.dataSource.query(
      `SELECT spi.industry_id AS "industryId", i.industry_name AS "industryName",
              spi.custom_industry_name AS "customIndustryName"
       FROM public.student_preferred_industry spi
       JOIN public.industry i ON i.industry_id = spi.industry_id
       WHERE spi.student_id = $1
       ORDER BY i.industry_name, i.industry_id`,
      [studentId],
    );
    return { ...rows[0], preferredIndustries };
  }

  async updateStudent(studentId: number, dto: UpdateAdminStudentDto) {
    this.assertPositiveId(studentId, 'studentId');
    this.assertPastBirthDate(dto.birthDate);
    if (dto.startDate) {
      assertValidDate(dto.startDate, 'startDate');
      if (dto.startDate < currentManilaDate()) {
        throw new BadRequestException('startDate cannot be in the past.');
      }
    }
    await this.dataSource.transaction(async (manager) => {
      const current: Array<{ account_status: AccountStatus }> =
        await manager.query(
          `SELECT ua.account_status
         FROM public.student s
         JOIN public.user_account ua ON ua.user_account_id = s.user_account_id AND ua.user_role = 'student'
         WHERE s.student_id = $1 FOR UPDATE OF s, ua`,
          [studentId],
        );
      if (!current.length) throw new NotFoundException('Student not found.');
      this.assertEditable(current[0].account_status, 'student');

      if (dto.preferredIndustries !== undefined) {
        await this.validatePreferredIndustries(
          manager,
          dto.preferredIndustries,
        );
      }

      await this.updateColumns(
        manager,
        'student',
        'student_id',
        studentId,
        dto,
        {
          firstName: 'first_name',
          middleName: 'middle_name',
          lastName: 'last_name',
          extensionName: 'extension_name',
          birthDate: 'birth_date',
          sex: 'sex',
          addressLine: 'address_line',
          addressBarangay: 'address_barangay',
          addressDistrict: 'address_district',
          addressCity: 'address_city',
          contactEmail: 'contact_email',
          contactNumber: 'contact_number',
          linkedinUrl: 'linkedin_url',
        },
      );
      await this.updateColumns(
        manager,
        'student_academic_information',
        'student_id',
        studentId,
        dto,
        {
          schoolName: 'school_name',
          yearLevel: 'year_level',
          strandProgram: 'strand_program',
        },
      );
      await this.updateColumns(
        manager,
        'internship_preference',
        'student_id',
        studentId,
        dto,
        {
          requiredHours: 'required_hours',
          availableDays: 'available_days',
          startDate: 'start_date',
          preferredCompanyType: 'preferred_company_type',
          allowsOutsidePreferredField: 'allows_outside_preferred_field',
        },
      );

      if (dto.preferredIndustries !== undefined) {
        await manager.query(
          'DELETE FROM public.student_preferred_industry WHERE student_id = $1',
          [studentId],
        );
        for (const item of dto.preferredIndustries) {
          await manager.query(
            `INSERT INTO public.student_preferred_industry (student_id, industry_id, custom_industry_name)
             VALUES ($1, $2, $3)`,
            [studentId, item.industryId, item.customIndustryName ?? null],
          );
        }
      }
    });
    return this.getStudent(studentId);
  }

  async listEmployers(query: AdminListQueryDto) {
    const filter = this.listFilter(query, ['c.company_name', 'ua.email']);
    const [summary, countRows, data]: [
      SummaryRow,
      Array<{ total: string }>,
      unknown[],
    ] = await Promise.all([
      this.summary(UserRole.COMPANY, 'company', 'c'),
      this.dataSource.query(
        `SELECT count(*) AS total FROM public.user_account ua
         JOIN public.company c ON c.user_account_id = ua.user_account_id
         WHERE ua.user_role = 'company' ${filter.sql}`,
        filter.params,
      ),
      this.dataSource.query(
        `SELECT c.company_id AS "companyId", ua.user_account_id AS "userAccountId",
                c.company_name AS "companyName", ua.email AS "accountEmail",
                ua.created_at AS "createdAt", ua.account_status AS "accountStatus", ua.suspended_until AS "suspendedUntil"
         FROM public.user_account ua JOIN public.company c ON c.user_account_id = ua.user_account_id
         WHERE ua.user_role = 'company' ${filter.sql}
         ORDER BY ua.created_at DESC, c.company_id DESC
         LIMIT $${filter.params.length + 1} OFFSET $${filter.params.length + 2}`,
        [...filter.params, query.limit, (query.page - 1) * query.limit],
      ),
    ]);
    return this.listResponse(data, summary, countRows, query);
  }

  async getEmployer(companyId: number) {
    this.assertPositiveId(companyId, 'companyId');
    const rows = await this.dataSource.query(
      `SELECT c.company_id AS "companyId", ua.user_account_id AS "userAccountId",
              ua.email AS "accountEmail", ua.account_status AS "accountStatus", ua.suspended_until AS "suspendedUntil", ua.created_at AS "createdAt",
              c.company_name AS "companyName", c.company_type AS "companyType",
              c.industry_id AS "industryId", i.industry_name AS "industryName",
              c.company_size AS "companySize", c.year_established AS "yearEstablished",
              c.website_url AS "websiteUrl", c.description, c.logo_file_path AS "logoFilePath",
              c.updated_at AS "profileUpdatedAt",
              c.address_line AS "addressLine", c.address_barangay AS "addressBarangay",
              c.address_district AS "addressDistrict", c.address_city AS "addressCity",
              c.contact_person_first_name AS "contactPersonFirstName",
              c.contact_person_middle_name AS "contactPersonMiddleName",
              c.contact_person_last_name AS "contactPersonLastName",
              c.contact_person_extension_name AS "contactPersonExtensionName",
              concat_ws(' ', c.contact_person_first_name, c.contact_person_middle_name,
                c.contact_person_last_name, c.contact_person_extension_name) AS "contactPersonFullName",
              c.contact_email AS "contactEmail", c.contact_number AS "contactNumber"
       FROM public.company c
       JOIN public.user_account ua ON ua.user_account_id = c.user_account_id AND ua.user_role = 'company'
       JOIN public.industry i ON i.industry_id = c.industry_id
       WHERE c.company_id = $1`,
      [companyId],
    );
    if (!rows.length) throw new NotFoundException('Employer not found.');
    return rows[0];
  }

  async createEmployer(dto: CreateAdminEmployerDto) {
    const companyId = await this.dataSource.transaction(async (manager) => {
      await this.validateCompanyIndustry(manager, dto.industryId);
      const duplicate = await manager.query(
        'SELECT 1 FROM public.user_account WHERE lower(email) = lower($1)',
        [dto.accountEmail],
      );
      if (duplicate.length)
        throw new ConflictException('Account email is already in use.');

      const accounts = await manager.query(
        `INSERT INTO public.user_account (email, user_role)
         VALUES (lower($1), 'company')
         RETURNING user_account_id`,
        [dto.accountEmail],
      );
      const userAccountId = Number(accounts[0].user_account_id);
      await manager.query(
        `INSERT INTO public.local_authentication_credential (user_account_id, password_hash)
         VALUES ($1, $2)`,
        [userAccountId, await bcrypt.hash(dto.initialPassword, 10)],
      );
      const companies = await manager.query(
        `INSERT INTO public.company (
           user_account_id, industry_id, company_name, company_type,
           description, website_url, year_established, company_size,
           contact_email, contact_number, contact_person_first_name,
           contact_person_middle_name, contact_person_last_name,
           contact_person_extension_name, address_line, address_barangay,
           address_district, address_city, logo_file_path
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           $14, $15, $16, $17, $18, NULL
         ) RETURNING company_id`,
        [
          userAccountId,
          dto.industryId,
          dto.companyName,
          dto.companyType,
          dto.description,
          dto.websiteUrl ?? null,
          dto.yearEstablished ?? null,
          dto.companySize ?? null,
          dto.contactEmail,
          dto.contactNumber,
          dto.contactPersonFirstName,
          dto.contactPersonMiddleName ?? null,
          dto.contactPersonLastName,
          dto.contactPersonExtensionName ?? null,
          dto.addressLine,
          dto.addressBarangay,
          dto.addressDistrict ?? null,
          dto.addressCity,
        ],
      );
      return Number(companies[0].company_id);
    });
    return this.getEmployer(companyId);
  }

  async updateEmployer(companyId: number, dto: UpdateAdminEmployerDto) {
    this.assertPositiveId(companyId, 'companyId');
    await this.dataSource.transaction(async (manager) => {
      const current: Array<{ account_status: AccountStatus }> =
        await manager.query(
          `SELECT ua.account_status FROM public.company c
         JOIN public.user_account ua ON ua.user_account_id = c.user_account_id AND ua.user_role = 'company'
         WHERE c.company_id = $1 FOR UPDATE OF c, ua`,
          [companyId],
        );
      if (!current.length) throw new NotFoundException('Employer not found.');
      this.assertEditable(current[0].account_status, 'employer');
      if (dto.industryId !== undefined)
        await this.validateCompanyIndustry(manager, dto.industryId);
      await this.updateColumns(
        manager,
        'company',
        'company_id',
        companyId,
        dto,
        {
          companyName: 'company_name',
          companyType: 'company_type',
          industryId: 'industry_id',
          companySize: 'company_size',
          yearEstablished: 'year_established',
          websiteUrl: 'website_url',
          description: 'description',
          addressLine: 'address_line',
          addressBarangay: 'address_barangay',
          addressDistrict: 'address_district',
          addressCity: 'address_city',
          contactPersonFirstName: 'contact_person_first_name',
          contactPersonMiddleName: 'contact_person_middle_name',
          contactPersonLastName: 'contact_person_last_name',
          contactPersonExtensionName: 'contact_person_extension_name',
          contactEmail: 'contact_email',
          contactNumber: 'contact_number',
        },
      );
    });
    return this.getEmployer(companyId);
  }

  async listPesoPersonnel(query: AdminListQueryDto) {
    const filter = this.listFilter(query, [
      `concat_ws(' ', p.first_name, p.middle_name, p.last_name, p.extension_name)`,
      'ua.email',
      'p.employee_id',
    ]);
    const [summary, countRows, data]: [
      SummaryRow,
      Array<{ total: string }>,
      unknown[],
    ] = await Promise.all([
      this.summary(UserRole.PESO_PERSONNEL, 'peso_personnel', 'p'),
      this.dataSource.query(
        `SELECT count(*) AS total FROM public.user_account ua
         JOIN public.peso_personnel p ON p.user_account_id = ua.user_account_id
         WHERE ua.user_role = 'peso_personnel' ${filter.sql}`,
        filter.params,
      ),
      this.dataSource.query(
        `SELECT p.peso_personnel_id AS "pesoPersonnelId", ua.user_account_id AS "userAccountId",
                concat_ws(' ', p.first_name, p.middle_name, p.last_name, p.extension_name) AS "fullName",
                ua.email AS "accountEmail", p.employee_id AS "employeeId",
                ua.created_at AS "createdAt", ua.account_status AS "accountStatus", ua.suspended_until AS "suspendedUntil"
         FROM public.user_account ua JOIN public.peso_personnel p ON p.user_account_id = ua.user_account_id
         WHERE ua.user_role = 'peso_personnel' ${filter.sql}
         ORDER BY ua.created_at DESC, p.peso_personnel_id DESC
         LIMIT $${filter.params.length + 1} OFFSET $${filter.params.length + 2}`,
        [...filter.params, query.limit, (query.page - 1) * query.limit],
      ),
    ]);
    return this.listResponse(data, summary, countRows, query);
  }

  async getPesoPersonnel(pesoPersonnelId: number) {
    this.assertPositiveId(pesoPersonnelId, 'pesoPersonnelId');
    const rows = await this.dataSource.query(
      `SELECT p.peso_personnel_id AS "pesoPersonnelId", ua.user_account_id AS "userAccountId",
              ua.email AS "accountEmail", ua.account_status AS "accountStatus", ua.suspended_until AS "suspendedUntil", ua.created_at AS "createdAt",
              p.first_name AS "firstName", p.middle_name AS "middleName", p.last_name AS "lastName",
              p.extension_name AS "extensionName",
              concat_ws(' ', p.first_name, p.middle_name, p.last_name, p.extension_name) AS "fullName",
              p.birth_date::text AS "birthDate", p.sex,
              p.address_line AS "addressLine", p.address_barangay AS "addressBarangay",
              p.address_district AS "addressDistrict", p.address_city AS "addressCity",
              p.contact_email AS "contactEmail", p.contact_number AS "contactNumber",
              p.employee_id AS "employeeId", p.department, p.position,
              p.photo_file_path AS "photoFilePath", p.updated_at AS "profileUpdatedAt"
       FROM public.peso_personnel p
       JOIN public.user_account ua ON ua.user_account_id = p.user_account_id AND ua.user_role = 'peso_personnel'
       WHERE p.peso_personnel_id = $1`,
      [pesoPersonnelId],
    );
    if (!rows.length)
      throw new NotFoundException('QC PESO personnel not found.');
    return rows[0];
  }

  async createPesoPersonnel(dto: CreateAdminPesoPersonnelDto) {
    this.assertPastBirthDate(dto.birthDate);
    const pesoPersonnelId = await this.dataSource.transaction(
      async (manager) => {
        const duplicate = await manager.query(
          `SELECT 1
           WHERE EXISTS (
             SELECT 1 FROM public.user_account
             WHERE lower(email) = lower($1)
           ) OR EXISTS (
             SELECT 1 FROM public.peso_personnel
             WHERE lower(employee_id) = lower($2)
           )`,
          [dto.accountEmail, dto.employeeId],
        );
        if (duplicate.length)
          throw new ConflictException(
            'Account email or employee ID is already in use.',
          );

        const accounts = await manager.query(
          `INSERT INTO public.user_account (email, user_role)
           VALUES (lower($1), 'peso_personnel')
           RETURNING user_account_id`,
          [dto.accountEmail],
        );
        const userAccountId = Number(accounts[0].user_account_id);
        await manager.query(
          `INSERT INTO public.local_authentication_credential (user_account_id, password_hash)
           VALUES ($1, $2)`,
          [userAccountId, await bcrypt.hash(dto.initialPassword, 10)],
        );
        const profiles = await manager.query(
          `INSERT INTO public.peso_personnel (
             user_account_id, first_name, middle_name, last_name,
             extension_name, sex, birth_date, address_line,
             address_barangay, address_district, address_city, contact_number,
             contact_email, employee_id, position, department
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
             $14, $15, $16
           ) RETURNING peso_personnel_id`,
          [
            userAccountId,
            dto.firstName,
            dto.middleName ?? null,
            dto.lastName,
            dto.extensionName ?? null,
            dto.sex,
            dto.birthDate,
            dto.addressLine,
            dto.addressBarangay,
            dto.addressDistrict,
            dto.addressCity,
            dto.contactNumber,
            dto.contactEmail,
            dto.employeeId,
            dto.position,
            dto.department,
          ],
        );
        return Number(profiles[0].peso_personnel_id);
      },
    );
    return this.getPesoPersonnel(pesoPersonnelId);
  }

  async updatePesoPersonnel(
    pesoPersonnelId: number,
    dto: UpdateAdminPesoPersonnelDto,
  ) {
    this.assertPositiveId(pesoPersonnelId, 'pesoPersonnelId');
    this.assertPastBirthDate(dto.birthDate);
    await this.dataSource.transaction(async (manager) => {
      const current: Array<{ account_status: AccountStatus }> =
        await manager.query(
          `SELECT ua.account_status FROM public.peso_personnel p
         JOIN public.user_account ua ON ua.user_account_id = p.user_account_id AND ua.user_role = 'peso_personnel'
         WHERE p.peso_personnel_id = $1 FOR UPDATE OF p, ua`,
          [pesoPersonnelId],
        );
      if (!current.length)
        throw new NotFoundException('QC PESO personnel not found.');
      this.assertEditable(current[0].account_status, 'QC PESO personnel');
      if (dto.employeeId !== undefined) {
        const duplicate = await manager.query(
          `SELECT 1 FROM public.peso_personnel
           WHERE lower(employee_id) = lower($1) AND peso_personnel_id <> $2`,
          [dto.employeeId, pesoPersonnelId],
        );
        if (duplicate.length)
          throw new ConflictException('Employee ID is already in use.');
      }
      await this.updateColumns(
        manager,
        'peso_personnel',
        'peso_personnel_id',
        pesoPersonnelId,
        dto,
        {
          firstName: 'first_name',
          middleName: 'middle_name',
          lastName: 'last_name',
          extensionName: 'extension_name',
          birthDate: 'birth_date',
          sex: 'sex',
          addressLine: 'address_line',
          addressBarangay: 'address_barangay',
          addressDistrict: 'address_district',
          addressCity: 'address_city',
          contactEmail: 'contact_email',
          contactNumber: 'contact_number',
          employeeId: 'employee_id',
          department: 'department',
          position: 'position',
        },
      );
    });
    return this.getPesoPersonnel(pesoPersonnelId);
  }

  async updateAccountStatus(
    userAccountId: number,
    adminAccountId: number,
    dto: UpdateAdminAccountStatusDto,
  ) {
    this.assertPositiveId(userAccountId, 'userAccountId');
    if (
      dto.status !== AccountStatus.SUSPENDED &&
      dto.suspensionDays !== undefined
    ) {
      throw new BadRequestException(
        'suspensionDays is allowed only when status is suspended.',
      );
    }
    return withStatusActor(this.dataSource, adminAccountId, async (runner) => {
      const rows = await runner.query(
        `SELECT user_account_id, account_status, user_role
         FROM public.user_account
         WHERE user_account_id = $1 AND user_role IN ('student', 'company', 'peso_personnel')
         FOR UPDATE`,
        [userAccountId],
      );
      if (!rows.length)
        throw new NotFoundException('Managed account not found.');
      const current = rows[0].account_status as AccountStatus;

      if (dto.status === AccountStatus.SUSPENDED) {
        if (current === AccountStatus.ARCHIVED)
          throw this.invalidTransition(current, dto.status);
        if (current !== AccountStatus.ACTIVE)
          throw this.invalidTransition(current, dto.status);
      }

      if (
        dto.status === AccountStatus.ACTIVE &&
        current !== AccountStatus.SUSPENDED
      ) {
        throw this.invalidTransition(current, dto.status);
      }
      if (
        dto.status === AccountStatus.ARCHIVED &&
        ![AccountStatus.ACTIVE, AccountStatus.SUSPENDED].includes(current)
      ) {
        throw this.invalidTransition(current, dto.status);
      }

      await runner.query(
        `UPDATE public.user_account
         SET account_status = $2::public.account_status_enum,
             deleted_at = CASE
               WHEN $2::public.account_status_enum = 'archived' THEN CURRENT_TIMESTAMP
               ELSE NULL
             END,
             suspended_until = CASE
               WHEN $2::public.account_status_enum = 'suspended'
                 THEN CURRENT_TIMESTAMP + make_interval(days => $3::integer)
               ELSE NULL
             END
         WHERE user_account_id = $1`,
        [userAccountId, dto.status, dto.suspensionDays ?? null],
      );
      const updated = await runner.query(
        `SELECT user_account_id AS "userAccountId",
                account_status AS "accountStatus",
                suspended_until AS "suspendedUntil"
         FROM public.user_account WHERE user_account_id = $1`,
        [userAccountId],
      );
      return updated[0];
    });
  }

  private listFilter(query: AdminListQueryDto, searchColumns: string[]) {
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      clauses.push(
        `(${searchColumns.map((column) => `lower(${column}) LIKE $${params.length}`).join(' OR ')})`,
      );
    }
    if (query.status) {
      params.push(query.status);
      clauses.push(`ua.account_status = $${params.length}`);
    }
    return {
      sql: clauses.length ? `AND ${clauses.join(' AND ')}` : '',
      params,
    };
  }

  private async summary(
    role: UserRole,
    profileTable: string,
    alias: string,
  ): Promise<SummaryRow> {
    const rows = await this.dataSource.query(
      `SELECT count(*) AS total,
              count(*) FILTER (WHERE ua.account_status = 'active') AS active,
              count(*) FILTER (WHERE ua.account_status = 'suspended') AS suspended,
              count(*) FILTER (WHERE ua.account_status = 'archived') AS archived
       FROM public.user_account ua
       JOIN public.${profileTable} ${alias} ON ${alias}.user_account_id = ua.user_account_id
       WHERE ua.user_role = $1`,
      [role],
    );
    return rows[0] as SummaryRow;
  }

  private listResponse(
    data: unknown[],
    summary: SummaryRow,
    countRows: Array<{ total: string }>,
    query: AdminListQueryDto,
  ) {
    const total = Number(countRows[0]?.total ?? 0);
    return {
      data,
      summary: {
        total: Number(summary.total),
        active: Number(summary.active),
        suspended: Number(summary.suspended),
        archived: Number(summary.archived),
      },
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private async updateColumns(
    runner:
      | QueryRunner
      | { query: (sql: string, parameters?: unknown[]) => Promise<unknown> },
    table: string,
    idColumn: string,
    id: number,
    dto: object,
    mapping: Record<string, string>,
  ) {
    const body = dto as Record<string, unknown>;
    const entries = Object.entries(mapping).filter(
      ([property]) => body[property] !== undefined,
    );
    if (!entries.length) return;
    const values = entries.map(([property]) => body[property]);
    const assignments = entries.map(
      ([, column], index) => `${column} = $${index + 2}`,
    );
    await runner.query(
      `UPDATE public.${table} SET ${assignments.join(', ')} WHERE ${idColumn} = $1`,
      [id, ...values],
    );
  }

  private async validatePreferredIndustries(
    runner: {
      query: (
        sql: string,
        parameters?: unknown[],
      ) => Promise<Array<{ industry_id: number; is_custom_text: boolean }>>;
    },
    values: PreferredIndustryDto[],
  ) {
    const ids = values.map((item) => item.industryId);
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('Preferred industry IDs must be unique.');
    if (!ids.length) return;
    const industries = await runner.query(
      'SELECT industry_id, is_custom_text FROM public.industry WHERE industry_id = ANY($1::int[])',
      [ids],
    );
    if (industries.length !== ids.length)
      throw new BadRequestException('A preferred industry does not exist.');
    const byId = new Map(
      industries.map((row) => [Number(row.industry_id), row.is_custom_text]),
    );
    for (const item of values) {
      const custom = byId.get(item.industryId);
      if (custom && !item.customIndustryName) {
        throw new BadRequestException(
          'customIndustryName is required for the custom industry.',
        );
      }
      if (!custom && item.customIndustryName != null) {
        throw new BadRequestException(
          'customIndustryName is allowed only for the custom industry.',
        );
      }
    }
  }

  private async validateCompanyIndustry(
    runner: {
      query: (sql: string, parameters?: unknown[]) => Promise<unknown[]>;
    },
    industryId: number,
  ) {
    const rows = await runner.query(
      'SELECT 1 FROM public.industry WHERE industry_id = $1 AND is_custom_text = false',
      [industryId],
    );
    if (!rows.length)
      throw new BadRequestException(
        'industryId must identify a standard industry.',
      );
  }

  private assertEditable(status: AccountStatus, label: string) {
    if (status === AccountStatus.ARCHIVED) {
      throw new ConflictException(
        `Archived ${label} accounts cannot be edited.`,
      );
    }
  }

  private assertPositiveId(id: number, name: string) {
    if (!Number.isInteger(id) || id < 1)
      throw new BadRequestException(`${name} must be a positive integer.`);
  }

  private assertPastBirthDate(value?: string) {
    if (value) {
      assertValidDate(value, 'birthDate');
      if (value >= currentManilaDate()) {
        throw new BadRequestException('birthDate must be in the past.');
      }
    }
  }

  private invalidTransition(from: AccountStatus, to: AccountStatus) {
    return new ConflictException({
      code: 'INVALID_ACCOUNT_STATUS_TRANSITION',
      message: `Account status transition ${from} -> ${to} is not allowed.`,
    });
  }

}
