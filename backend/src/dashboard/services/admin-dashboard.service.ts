import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AdminDashboardMetricsDto,
  UpdateEmployerAccountDto,
  UpdatePesoPersonnelAccountDto,
  UpdateStudentAccountDto,
} from '../dto/admin-dashboard.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { setStatusActor } from '../../database/status-actor.transaction';
import { UserRole } from '../../users/entities/account.entities';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly dataSource: DataSource) {}

  // Common role dashboard metrics
  async getRoleDashboardMetrics(
    userRole: UserRole,
  ): Promise<AdminDashboardMetricsDto> {
    const sql = `
      SELECT account_status, COUNT(*) AS count
      FROM public.user_account
      WHERE user_role = $1 AND deleted_at IS NULL
      GROUP BY account_status
    `;
    const rows = await this.dataSource.query(sql, [userRole]);

    let activeAccounts = 0;
    let deactivatedAccounts = 0;
    let totalRegistered = 0;

    for (const row of rows) {
      const count = Number(row.count || 0);
      totalRegistered += count;
      if (row.account_status === 'active') {
        activeAccounts += count;
      } else if (
        row.account_status === 'suspended' ||
        row.account_status === 'archived'
      ) {
        deactivatedAccounts += count;
      }
    }

    return {
      totalRegistered,
      activeAccounts,
      deactivatedAccounts,
    };
  }

  // G1. Admin student dashboard metrics
  getStudentMetrics(): Promise<AdminDashboardMetricsDto> {
    return this.getRoleDashboardMetrics(UserRole.STUDENT);
  }

  // G2. GET all students
  async getAllStudents(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const page = Math.max(1, Number(paginationDto?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(paginationDto?.limit) || 20));
    const offset = (page - 1) * limit;

    const countSql = `
      SELECT COUNT(*) AS count
      FROM public.user_account ua
      JOIN public.student s ON s.user_account_id = ua.user_account_id
      WHERE ua.user_role = 'student' AND ua.deleted_at IS NULL
    `;
    const countRes = await this.dataSource.query(countSql);
    const total = Number(countRes[0]?.count || 0);

    const dataSql = `
      SELECT 
        ua.user_account_id AS "userAccountId",
        s.student_id AS "studentId",
        concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS "name",
        ua.email AS "email",
        sai.school_name AS "school",
        sai.strand_program AS "program",
        ua.created_at AS "dateRegistered",
        ua.account_status AS "accountStatus"
      FROM public.user_account ua
      JOIN public.student s ON s.user_account_id = ua.user_account_id
      LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
      WHERE ua.user_role = 'student' AND ua.deleted_at IS NULL
      ORDER BY ua.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const data = await this.dataSource.query(dataSql, [limit, offset]);
    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // G4. GET student account details (excluding applications and secrets)
  async getStudentDetails(userAccountId: number): Promise<any> {
    const studentSql = `
      SELECT 
        s.student_id AS "studentId",
        s.user_account_id AS "userAccountId",
        ua.email AS "email",
        ua.account_status AS "accountStatus",
        ua.created_at AS "createdAt",
        s.first_name AS "firstName",
        s.middle_name AS "middleName",
        s.last_name AS "lastName",
        s.extension_name AS "extensionName",
        s.sex AS "sex",
        s.birth_date AS "birthDate",
        s.contact_number AS "contactNumber",
        s.contact_email AS "contactEmail",
        s.linkedin_url AS "linkedinUrl",
        s.address_line AS "addressLine",
        s.address_barangay AS "addressBarangay",
        s.address_district AS "addressDistrict",
        s.address_city AS "addressCity",
        s.inquiry_method AS "inquiryMethod",
        s.photo_file_path AS "photoFilePath",
        sai.school_name AS "schoolName",
        sai.year_level AS "yearLevel",
        sai.strand_program AS "strandProgram",
        ip.required_hours AS "preferredRequiredHours",
        ip.available_days AS "preferredAvailableDays",
        ip.start_date AS "preferredStartDate",
        ip.preferred_company_type AS "preferredCompanyType",
        ip.allows_outside_preferred_field AS "allowsOutsidePreferredField"
      FROM public.user_account ua
      JOIN public.student s ON s.user_account_id = ua.user_account_id
      LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
      LEFT JOIN public.internship_preference ip ON ip.student_id = s.student_id
      WHERE ua.user_account_id = $1 AND ua.user_role = 'student' AND ua.deleted_at IS NULL
    `;
    const rows = await this.dataSource.query(studentSql, [userAccountId]);
    if (!rows || rows.length === 0) {
      throw new NotFoundException('Student account not found.');
    }
    const student = rows[0];

    const docsSql = `
      SELECT 
        srs.student_requirement_submission_id AS "submissionId",
        rt.requirement_type_name AS "requirementTypeName",
        srs.requirement_name AS "requirementName",
        srs.submitted_at AS "submittedAt"
      FROM public.student_requirement_submission srs
      JOIN public.requirement_type rt ON rt.requirement_type_id = srs.requirement_type_id
      WHERE srs.student_id = $1
      ORDER BY srs.submitted_at DESC
    `;
    const docs = await this.dataSource.query(docsSql, [student.studentId]);

    return {
      ...student,
      requirementSubmissions: docs,
    };
  }

  // G3. PATCH student account details
  async updateStudentAccount(
    userAccountId: number,
    adminAccountId: number,
    dto: UpdateStudentAccountDto,
  ): Promise<any> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      await setStatusActor(runner, adminAccountId);

      const studentRows = await runner.query(
        `SELECT s.student_id, ua.account_status 
         FROM public.student s 
         JOIN public.user_account ua ON ua.user_account_id = s.user_account_id
         WHERE s.user_account_id = $1 AND ua.user_role = 'student' AND ua.deleted_at IS NULL
         FOR UPDATE`,
        [userAccountId],
      );

      if (!studentRows || studentRows.length === 0) {
        throw new NotFoundException('Student account not found.');
      }
      const studentId = studentRows[0].student_id;

      if (
        dto.accountStatus &&
        dto.accountStatus !== studentRows[0].account_status
      ) {
        await runner.query(
          `UPDATE public.user_account 
           SET account_status = $1,
               deleted_at = CASE WHEN $1 = 'archived' THEN CURRENT_TIMESTAMP ELSE NULL END
           WHERE user_account_id = $2`,
          [dto.accountStatus, userAccountId],
        );
      }

      const studentUpdates: string[] = [];
      const studentParams: any[] = [];
      let sIdx = 1;

      if (dto.firstName !== undefined) {
        studentUpdates.push(`first_name = $${sIdx++}`);
        studentParams.push(dto.firstName);
      }
      if (dto.middleName !== undefined) {
        studentUpdates.push(`middle_name = $${sIdx++}`);
        studentParams.push(dto.middleName || null);
      }
      if (dto.lastName !== undefined) {
        studentUpdates.push(`last_name = $${sIdx++}`);
        studentParams.push(dto.lastName);
      }
      if (dto.extensionName !== undefined) {
        studentUpdates.push(`extension_name = $${sIdx++}`);
        studentParams.push(dto.extensionName || null);
      }
      if (dto.sex !== undefined) {
        studentUpdates.push(`sex = $${sIdx++}`);
        studentParams.push(dto.sex);
      }
      if (dto.birthDate !== undefined) {
        studentUpdates.push(`birth_date = $${sIdx++}`);
        studentParams.push(dto.birthDate);
      }
      if (dto.contactNumber !== undefined) {
        studentUpdates.push(`contact_number = $${sIdx++}`);
        studentParams.push(dto.contactNumber);
      }
      if (dto.contactEmail !== undefined) {
        studentUpdates.push(`contact_email = $${sIdx++}`);
        studentParams.push(dto.contactEmail);
      }
      if (dto.linkedinUrl !== undefined) {
        studentUpdates.push(`linkedin_url = $${sIdx++}`);
        studentParams.push(dto.linkedinUrl || null);
      }
      if (dto.addressLine !== undefined) {
        studentUpdates.push(`address_line = $${sIdx++}`);
        studentParams.push(dto.addressLine);
      }
      if (dto.addressBarangay !== undefined) {
        studentUpdates.push(`address_barangay = $${sIdx++}`);
        studentParams.push(dto.addressBarangay);
      }
      if (dto.addressDistrict !== undefined) {
        studentUpdates.push(`address_district = $${sIdx++}`);
        studentParams.push(dto.addressDistrict);
      }
      if (dto.addressCity !== undefined) {
        studentUpdates.push(`address_city = $${sIdx++}`);
        studentParams.push(dto.addressCity);
      }

      if (studentUpdates.length > 0) {
        studentParams.push(studentId);
        await runner.query(
          `UPDATE public.student SET ${studentUpdates.join(', ')} WHERE student_id = $${sIdx}`,
          studentParams,
        );
      }

      if (dto.schoolName || dto.yearLevel || dto.strandProgram) {
        const academicUpdates: string[] = [];
        const academicParams: any[] = [];
        let aIdx = 1;

        if (dto.schoolName !== undefined) {
          academicUpdates.push(`school_name = $${aIdx++}`);
          academicParams.push(dto.schoolName);
        }
        if (dto.yearLevel !== undefined) {
          academicUpdates.push(`year_level = $${aIdx++}`);
          academicParams.push(dto.yearLevel);
        }
        if (dto.strandProgram !== undefined) {
          academicUpdates.push(`strand_program = $${aIdx++}`);
          academicParams.push(dto.strandProgram);
        }

        academicParams.push(studentId);
        await runner.query(
          `UPDATE public.student_academic_information SET ${academicUpdates.join(', ')} WHERE student_id = $${aIdx}`,
          academicParams,
        );
      }

      await runner.commitTransaction();
      return { message: 'Student account updated successfully.' };
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    } finally {
      await runner.release();
    }
  }

  // H1. Admin employer dashboard metrics
  getEmployerMetrics(): Promise<AdminDashboardMetricsDto> {
    return this.getRoleDashboardMetrics(UserRole.COMPANY);
  }

  // H2. GET all employers
  async getAllEmployers(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const page = Math.max(1, Number(paginationDto?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(paginationDto?.limit) || 20));
    const offset = (page - 1) * limit;

    const countSql = `
      SELECT COUNT(*) AS count
      FROM public.user_account ua
      JOIN public.company c ON c.user_account_id = ua.user_account_id
      WHERE ua.user_role = 'company' AND ua.deleted_at IS NULL
    `;
    const countRes = await this.dataSource.query(countSql);
    const total = Number(countRes[0]?.count || 0);

    const dataSql = `
      SELECT 
        ua.user_account_id AS "userAccountId",
        c.company_id AS "companyId",
        c.company_name AS "companyName",
        ua.email AS "email",
        ua.created_at AS "dateRegistered",
        ua.account_status AS "accountStatus"
      FROM public.user_account ua
      JOIN public.company c ON c.user_account_id = ua.user_account_id
      WHERE ua.user_role = 'company' AND ua.deleted_at IS NULL
      ORDER BY ua.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const data = await this.dataSource.query(dataSql, [limit, offset]);
    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // H4. GET employer account details
  async getEmployerDetails(userAccountId: number): Promise<any> {
    const sql = `
      SELECT 
        c.company_id AS "companyId",
        c.user_account_id AS "userAccountId",
        ua.email AS "email",
        ua.account_status AS "accountStatus",
        ua.created_at AS "createdAt",
        c.company_name AS "companyName",
        c.company_type AS "companyType",
        i.industry_name AS "industryName",
        c.description AS "description",
        c.website_url AS "websiteUrl",
        c.year_established AS "yearEstablished",
        c.company_size AS "companySize",
        c.contact_email AS "contactEmail",
        c.contact_number AS "contactNumber",
        c.contact_person_first_name AS "contactPersonFirstName",
        c.contact_person_middle_name AS "contactPersonMiddleName",
        c.contact_person_last_name AS "contactPersonLastName",
        c.contact_person_extension_name AS "contactPersonExtensionName",
        c.address_line AS "addressLine",
        c.address_barangay AS "addressBarangay",
        c.address_district AS "addressDistrict",
        c.address_city AS "addressCity",
        c.logo_file_path AS "logoFilePath"
      FROM public.user_account ua
      JOIN public.company c ON c.user_account_id = ua.user_account_id
      JOIN public.industry i ON i.industry_id = c.industry_id
      WHERE ua.user_account_id = $1 AND ua.user_role = 'company' AND ua.deleted_at IS NULL
    `;
    const rows = await this.dataSource.query(sql, [userAccountId]);
    if (!rows || rows.length === 0) {
      throw new NotFoundException('Employer account not found.');
    }
    return rows[0];
  }

  // H3. PATCH employer account details
  async updateEmployerAccount(
    userAccountId: number,
    adminAccountId: number,
    dto: UpdateEmployerAccountDto,
  ): Promise<any> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      await setStatusActor(runner, adminAccountId);

      const companyRows = await runner.query(
        `SELECT c.company_id, ua.account_status 
         FROM public.company c 
         JOIN public.user_account ua ON ua.user_account_id = c.user_account_id
         WHERE c.user_account_id = $1 AND ua.user_role = 'company' AND ua.deleted_at IS NULL
         FOR UPDATE`,
        [userAccountId],
      );

      if (!companyRows || companyRows.length === 0) {
        throw new NotFoundException('Employer account not found.');
      }
      const companyId = companyRows[0].company_id;

      if (
        dto.accountStatus &&
        dto.accountStatus !== companyRows[0].account_status
      ) {
        await runner.query(
          `UPDATE public.user_account 
           SET account_status = $1,
               deleted_at = CASE WHEN $1 = 'archived' THEN CURRENT_TIMESTAMP ELSE NULL END
           WHERE user_account_id = $2`,
          [dto.accountStatus, userAccountId],
        );
      }

      const updates: string[] = [];
      const params: any[] = [];
      let cIdx = 1;

      if (dto.companyName !== undefined) {
        updates.push(`company_name = $${cIdx++}`);
        params.push(dto.companyName);
      }
      if (dto.companyType !== undefined) {
        updates.push(`company_type = $${cIdx++}`);
        params.push(dto.companyType);
      }
      if (dto.description !== undefined) {
        updates.push(`description = $${cIdx++}`);
        params.push(dto.description);
      }
      if (dto.websiteUrl !== undefined) {
        updates.push(`website_url = $${cIdx++}`);
        params.push(dto.websiteUrl || null);
      }
      if (dto.yearEstablished !== undefined) {
        updates.push(`year_established = $${cIdx++}`);
        params.push(dto.yearEstablished || null);
      }
      if (dto.companySize !== undefined) {
        updates.push(`company_size = $${cIdx++}`);
        params.push(dto.companySize || null);
      }
      if (dto.contactEmail !== undefined) {
        updates.push(`contact_email = $${cIdx++}`);
        params.push(dto.contactEmail);
      }
      if (dto.contactNumber !== undefined) {
        updates.push(`contact_number = $${cIdx++}`);
        params.push(dto.contactNumber);
      }
      if (dto.contactPersonFirstName !== undefined) {
        updates.push(`contact_person_first_name = $${cIdx++}`);
        params.push(dto.contactPersonFirstName);
      }
      if (dto.contactPersonMiddleName !== undefined) {
        updates.push(`contact_person_middle_name = $${cIdx++}`);
        params.push(dto.contactPersonMiddleName || null);
      }
      if (dto.contactPersonLastName !== undefined) {
        updates.push(`contact_person_last_name = $${cIdx++}`);
        params.push(dto.contactPersonLastName);
      }
      if (dto.contactPersonExtensionName !== undefined) {
        updates.push(`contact_person_extension_name = $${cIdx++}`);
        params.push(dto.contactPersonExtensionName || null);
      }
      if (dto.addressLine !== undefined) {
        updates.push(`address_line = $${cIdx++}`);
        params.push(dto.addressLine);
      }
      if (dto.addressBarangay !== undefined) {
        updates.push(`address_barangay = $${cIdx++}`);
        params.push(dto.addressBarangay);
      }
      if (dto.addressDistrict !== undefined) {
        updates.push(`address_district = $${cIdx++}`);
        params.push(dto.addressDistrict || null);
      }
      if (dto.addressCity !== undefined) {
        updates.push(`address_city = $${cIdx++}`);
        params.push(dto.addressCity);
      }

      if (updates.length > 0) {
        params.push(companyId);
        await runner.query(
          `UPDATE public.company SET ${updates.join(', ')} WHERE company_id = $${cIdx}`,
          params,
        );
      }

      await runner.commitTransaction();
      return { message: 'Employer account updated successfully.' };
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    } finally {
      await runner.release();
    }
  }

  // I1. Admin PESO dashboard metrics
  getPesoPersonnelMetrics(): Promise<AdminDashboardMetricsDto> {
    return this.getRoleDashboardMetrics(UserRole.PESO_PERSONNEL);
  }

  // I2. GET all PESO accounts
  async getAllPesoPersonnel(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const page = Math.max(1, Number(paginationDto?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(paginationDto?.limit) || 20));
    const offset = (page - 1) * limit;

    const countSql = `
      SELECT COUNT(*) AS count
      FROM public.user_account ua
      JOIN public.peso_personnel pp ON pp.user_account_id = ua.user_account_id
      WHERE ua.user_role = 'peso_personnel' AND ua.deleted_at IS NULL
    `;
    const countRes = await this.dataSource.query(countSql);
    const total = Number(countRes[0]?.count || 0);

    const dataSql = `
      SELECT 
        ua.user_account_id AS "userAccountId",
        pp.peso_personnel_id AS "pesoPersonnelId",
        concat_ws(' ', pp.first_name, pp.middle_name, pp.last_name, pp.extension_name) AS "name",
        ua.email AS "email",
        pp.position AS "position",
        pp.department AS "department",
        pp.verification_status AS "verificationStatus",
        ua.created_at AS "dateRegistered",
        ua.account_status AS "accountStatus"
      FROM public.user_account ua
      JOIN public.peso_personnel pp ON pp.user_account_id = ua.user_account_id
      WHERE ua.user_role = 'peso_personnel' AND ua.deleted_at IS NULL
      ORDER BY ua.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const data = await this.dataSource.query(dataSql, [limit, offset]);
    const totalPages = Math.ceil(total / limit) || (total === 0 ? 0 : 1);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // I4. GET PESO account details
  async getPesoPersonnelDetails(userAccountId: number): Promise<any> {
    const sql = `
      SELECT 
        pp.peso_personnel_id AS "pesoPersonnelId",
        pp.user_account_id AS "userAccountId",
        ua.email AS "email",
        ua.account_status AS "accountStatus",
        ua.created_at AS "createdAt",
        pp.first_name AS "firstName",
        pp.middle_name AS "middleName",
        pp.last_name AS "lastName",
        pp.extension_name AS "extensionName",
        pp.sex AS "sex",
        pp.birth_date AS "birthDate",
        pp.address_line AS "addressLine",
        pp.address_barangay AS "addressBarangay",
        pp.address_district AS "addressDistrict",
        pp.address_city AS "addressCity",
        pp.contact_number AS "contactNumber",
        pp.contact_email AS "contactEmail",
        pp.employee_id AS "employeeId",
        pp.position AS "position",
        pp.department AS "department",
        pp.verification_status AS "verificationStatus",
        pp.reviewed_at AS "reviewedAt",
        pp.reviewed_by_user_account_id AS "reviewedByUserAccountId",
        pp.verification_remark AS "verificationRemark"
      FROM public.user_account ua
      JOIN public.peso_personnel pp ON pp.user_account_id = ua.user_account_id
      WHERE ua.user_account_id = $1 AND ua.user_role = 'peso_personnel' AND ua.deleted_at IS NULL
    `;
    const rows = await this.dataSource.query(sql, [userAccountId]);
    if (!rows || rows.length === 0) {
      throw new NotFoundException('PESO personnel account not found.');
    }
    return rows[0];
  }

  // I3. PATCH PESO account details / verification
  async updatePesoPersonnelAccount(
    userAccountId: number,
    adminAccountId: number,
    dto: UpdatePesoPersonnelAccountDto,
  ): Promise<any> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      await setStatusActor(runner, adminAccountId);

      const personnelRows = await runner.query(
        `SELECT pp.peso_personnel_id, pp.verification_status, ua.account_status 
         FROM public.peso_personnel pp 
         JOIN public.user_account ua ON ua.user_account_id = pp.user_account_id
         WHERE pp.user_account_id = $1 AND ua.user_role = 'peso_personnel' AND ua.deleted_at IS NULL
         FOR UPDATE`,
        [userAccountId],
      );

      if (!personnelRows || personnelRows.length === 0) {
        throw new NotFoundException('PESO personnel account not found.');
      }
      const personnelId = personnelRows[0].peso_personnel_id;
      const currentVerificationStatus = personnelRows[0].verification_status;

      if (
        dto.accountStatus &&
        dto.accountStatus !== personnelRows[0].account_status
      ) {
        await runner.query(
          `UPDATE public.user_account 
           SET account_status = $1,
               deleted_at = CASE WHEN $1 = 'archived' THEN CURRENT_TIMESTAMP ELSE NULL END
           WHERE user_account_id = $2`,
          [dto.accountStatus, userAccountId],
        );
      }

      const updates: string[] = [];
      const params: any[] = [];
      let pIdx = 1;

      if (dto.firstName !== undefined) {
        updates.push(`first_name = $${pIdx++}`);
        params.push(dto.firstName);
      }
      if (dto.middleName !== undefined) {
        updates.push(`middle_name = $${pIdx++}`);
        params.push(dto.middleName || null);
      }
      if (dto.lastName !== undefined) {
        updates.push(`last_name = $${pIdx++}`);
        params.push(dto.lastName);
      }
      if (dto.extensionName !== undefined) {
        updates.push(`extension_name = $${pIdx++}`);
        params.push(dto.extensionName || null);
      }
      if (dto.sex !== undefined) {
        updates.push(`sex = $${pIdx++}`);
        params.push(dto.sex);
      }
      if (dto.birthDate !== undefined) {
        updates.push(`birth_date = $${pIdx++}`);
        params.push(dto.birthDate);
      }
      if (dto.contactNumber !== undefined) {
        updates.push(`contact_number = $${pIdx++}`);
        params.push(dto.contactNumber);
      }
      if (dto.contactEmail !== undefined) {
        updates.push(`contact_email = $${pIdx++}`);
        params.push(dto.contactEmail);
      }
      if (dto.employeeId !== undefined) {
        updates.push(`employee_id = $${pIdx++}`);
        params.push(dto.employeeId);
      }
      if (dto.position !== undefined) {
        updates.push(`position = $${pIdx++}`);
        params.push(dto.position);
      }
      if (dto.department !== undefined) {
        updates.push(`department = $${pIdx++}`);
        params.push(dto.department);
      }
      if (dto.addressLine !== undefined) {
        updates.push(`address_line = $${pIdx++}`);
        params.push(dto.addressLine);
      }
      if (dto.addressBarangay !== undefined) {
        updates.push(`address_barangay = $${pIdx++}`);
        params.push(dto.addressBarangay);
      }
      if (dto.addressDistrict !== undefined) {
        updates.push(`address_district = $${pIdx++}`);
        params.push(dto.addressDistrict);
      }
      if (dto.addressCity !== undefined) {
        updates.push(`address_city = $${pIdx++}`);
        params.push(dto.addressCity);
      }

      if (
        dto.verificationStatus &&
        dto.verificationStatus !== currentVerificationStatus
      ) {
        updates.push(`verification_status = $${pIdx++}`);
        params.push(dto.verificationStatus);
        updates.push(`reviewed_at = CURRENT_TIMESTAMP`);
        updates.push(`reviewed_by_user_account_id = $${pIdx++}`);
        params.push(adminAccountId);
        updates.push(`verification_remark = $${pIdx++}`);
        params.push(dto.verificationRemark?.trim() || null);
      }

      if (updates.length > 0) {
        params.push(personnelId);
        await runner.query(
          `UPDATE public.peso_personnel SET ${updates.join(', ')} WHERE peso_personnel_id = $${pIdx}`,
          params,
        );
      }

      await runner.commitTransaction();
      return { message: 'PESO personnel account updated successfully.' };
    } catch (err) {
      await runner.rollbackTransaction();
      throw err;
    } finally {
      await runner.release();
    }
  }
}
