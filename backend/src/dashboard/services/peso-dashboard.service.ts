import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  PesoApplicationManagementMetricsDto,
  PesoDtrDashboardMetricsDto,
  PesoEmployerDashboardMetricsDto,
  PesoStudentDashboardMetricsDto,
  QueryApplicationsDto,
  QueryAttendanceDto,
  QueryCompanyEmployersDto,
  QueryReferralsDto,
  UpdateApplicationStatusDto,
  ApplicationStatusFilter,
} from '../dto/peso-dashboard.dto';
import { DateFilterDto } from '../../common/dto/date-filter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { getDateBoundaries } from '../../common/helpers/date-filter.helper';
import { ApplicationQueryService } from './shared/application-query.service';
import { AttendanceQueryService } from './shared/attendance-query.service';
import { AdminUserManagementService } from '../../admin/services/admin-user-management.service';
import { CreateAdminEmployerDto } from '../../admin/dto/admin-user-management.dto';
import { withStatusActor } from '../../database/status-actor.transaction';
import { ReferralPdfService } from '../../storage/referral-pdf.service';
import { EmailQueueService } from '../../email/email-queue.service';
import { ReferralEmailPayload } from '../../email/email.interfaces';

@Injectable()
export class PesoDashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly applicationQuery: ApplicationQueryService,
    private readonly attendanceQuery: AttendanceQueryService,
    private readonly adminUserManagementService: AdminUserManagementService,
    private readonly referralPdfService: ReferralPdfService,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  async createEmployer(dto: CreateAdminEmployerDto) {
    return this.adminUserManagementService.createEmployer(dto);
  }

  // A1. Student dashboard metrics
  async getStudentDashboardMetrics(): Promise<PesoStudentDashboardMetricsDto> {
    const pendingAppsSql = `
      SELECT COUNT(*) AS count FROM public.application 
      WHERE application_status = 'submitted'
    `;
    const pendingAppsRes = await this.dataSource.query(pendingAppsSql);
    const totalPendingApplications = Number(pendingAppsRes[0]?.count || 0);

    /*
     * NOTE: student_requirement_submission currently lacks a 'verification_status' column.
     * When the schema is updated with verification_status, uncomment the following:
     * const verifiedReqSql = `
     *   SELECT COUNT(DISTINCT student_id) AS count
     *   FROM public.student_requirement_submission
     *   WHERE verification_status = 'verified'
     * `;
     * const verifiedReqRes = await this.dataSource.query(verifiedReqSql);
     * const totalVerifiedRequirements = Number(verifiedReqRes[0]?.count || 0);
     */
    const totalVerifiedRequirements = 0;

    const activeEmployersSql = `
      SELECT COUNT(*) AS count 
      FROM public.user_account ua
      JOIN public.company c ON c.user_account_id = ua.user_account_id
      WHERE ua.user_role = 'company' 
        AND ua.account_status = 'active'
        AND ua.deleted_at IS NULL
    `;
    const activeEmployersRes = await this.dataSource.query(activeEmployersSql);
    const totalActiveEmployers = Number(activeEmployersRes[0]?.count || 0);

    const availableOppSql = `
      SELECT COUNT(*) AS count FROM public.opportunity 
      WHERE opportunity_status = 'open'
    `;
    const availableOppRes = await this.dataSource.query(availableOppSql);
    const totalAvailableOpportunities = Number(availableOppRes[0]?.count || 0);

    return {
      totalPendingApplications,
      totalVerifiedRequirements,
      totalActiveEmployers,
      totalAvailableOpportunities,
    };
  }

  // A2. GET all student applications
  async getAllStudentApplications(
    queryDto: QueryApplicationsDto,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    return this.applicationQuery.getApplications(
      queryDto,
      paginationDto,
      undefined,
      true,
    );
  }

  // A3. Application management dashboard metrics
  async getApplicationManagementMetrics(
    dateFilterDto: DateFilterDto,
  ): Promise<PesoApplicationManagementMetricsDto> {
    const boundaries = getDateBoundaries(
      dateFilterDto.datePreset,
      dateFilterDto.startDate,
      dateFilterDto.endDate,
    );

    const whereClauses: string[] = [
      `NOT EXISTS (
        SELECT 1 FROM public.referral_visibility rv
        WHERE rv.referral_id = rd.referral_id
          AND rv.qc_peso_hidden_at IS NOT NULL
      )`,
    ];
    const params: any[] = [];
    let paramIndex = 1;

    if (boundaries) {
      whereClauses.push(`submitted_at >= $${paramIndex++}`);
      params.push(boundaries.start.toISOString());
      whereClauses.push(`submitted_at <= $${paramIndex++}`);
      params.push(boundaries.end.toISOString());
    }

    const whereSql =
      whereClauses.length > 0 ? ` AND ${whereClauses.join(' AND ')}` : '';

    const pendingSql = `
      SELECT COUNT(*) AS count FROM public.application 
      WHERE application_status = 'submitted' ${whereSql}
    `;
    const pendingRes = await this.dataSource.query(pendingSql, params);
    const pendingApplications = Number(pendingRes[0]?.count || 0);

    const rejectedSql = `
      SELECT COUNT(*) AS count FROM public.application 
      WHERE application_status = 'rejected_for_referral' ${whereSql}
    `;
    const rejectedRes = await this.dataSource.query(rejectedSql, params);
    const rejectedSubmissions = Number(rejectedRes[0]?.count || 0);

    /*
     * NOTE: student_requirement_submission currently lacks a 'verification_status' column.
     * When available, uncomment:
     * const verifiedSql = `
     *   SELECT COUNT(DISTINCT student_id) AS count
     *   FROM public.student_requirement_submission
     *   WHERE verification_status = 'verified'
     * `;
     */
    const verifiedRequirements = 0;

    return {
      pendingApplications,
      verifiedRequirements,
      rejectedSubmissions,
    };
  }

  // B1. GET all companies
  async getAllCompanies(
    queryDto: QueryCompanyEmployersDto,
  ): Promise<PaginatedResponse<any>> {
    const page = Math.max(1, Number(queryDto?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(queryDto?.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['ua.deleted_at IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    if (queryDto.accountStatus) {
      whereClauses.push(`ua.account_status = $${paramIndex++}`);
      params.push(queryDto.accountStatus);
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*) AS count
      FROM public.company c
      JOIN public.user_account ua ON ua.user_account_id = c.user_account_id
      ${whereSql}
    `;
    const countRes = await this.dataSource.query(countSql, params);
    const total = Number(countRes[0]?.count || 0);

    const dataSql = `
      SELECT 
        c.company_id AS "companyId",
        c.company_name AS "companyName",
        concat_ws(' ', c.contact_person_first_name, c.contact_person_middle_name, c.contact_person_last_name, c.contact_person_extension_name) AS "representativeName",
        c.contact_email AS "contactEmail",
        c.contact_number AS "contactNumber",
        c.company_type AS "companyType",
        ua.account_status AS "accountStatus",
        COALESCE(opp.cnt, 0) AS "activeOpportunityCount"
      FROM public.company c
      JOIN public.user_account ua ON ua.user_account_id = c.user_account_id
      LEFT JOIN (
        SELECT company_id, COUNT(*) AS cnt 
        FROM public.opportunity 
        WHERE opportunity_status = 'open' 
        GROUP BY company_id
      ) opp ON opp.company_id = c.company_id
      ${whereSql}
      ORDER BY c.company_name ASC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const data = await this.dataSource.query(dataSql, [
      ...params,
      limit,
      offset,
    ]);
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

  // B2. PESO employer dashboard metrics
  async getEmployerDashboardMetrics(): Promise<PesoEmployerDashboardMetricsDto> {
    const partnerSql = `
      SELECT COUNT(*) AS count 
      FROM public.user_account ua
      JOIN public.company c ON c.user_account_id = ua.user_account_id
      WHERE ua.user_role = 'company' 
        AND ua.account_status = 'active'
        AND ua.deleted_at IS NULL
    `;
    const partnerRes = await this.dataSource.query(partnerSql);
    const totalPartnerEmployers = Number(partnerRes[0]?.count || 0);

    const availableOppSql = `
      SELECT COUNT(*) AS count FROM public.opportunity 
      WHERE opportunity_status = 'open'
    `;
    const availableOppRes = await this.dataSource.query(availableOppSql);
    const totalAvailableOpportunities = Number(availableOppRes[0]?.count || 0);

    const pendingRegSql = `
      SELECT COUNT(*) AS count 
      FROM public.user_account ua
      JOIN public.company c ON c.user_account_id = ua.user_account_id
      WHERE ua.user_role = 'company' 
        AND ua.account_status = 'suspended'
        AND ua.deleted_at IS NULL
    `;
    const pendingRegRes = await this.dataSource.query(pendingRegSql);
    const pendingRegistrations = Number(pendingRegRes[0]?.count || 0);

    return {
      totalPartnerEmployers,
      totalAvailableOpportunities,
      pendingRegistrations,
    };
  }

  // C1. GET all referrals
  async getAllReferrals(
    queryDto: QueryReferralsDto,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const page = Math.max(1, Number(paginationDto?.page) || 1);
    const limit = Math.max(
      1,
      Math.min(100, Number(paginationDto?.limit) || 20),
    );
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (queryDto.companyResponse) {
      whereClauses.push(`rd.company_response = $${paramIndex++}`);
      params.push(queryDto.companyResponse);
    }

    const boundaries = getDateBoundaries(
      queryDto.datePreset,
      queryDto.startDate,
      queryDto.endDate,
    );

    if (boundaries) {
      whereClauses.push(`rd.referred_at >= $${paramIndex++}`);
      params.push(boundaries.start.toISOString());
      whereClauses.push(`rd.referred_at <= $${paramIndex++}`);
      params.push(boundaries.end.toISOString());
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS count FROM public.vw_referral_details rd ${whereSql}`;
    const countRes = await this.dataSource.query(countSql, params);
    const total = Number(countRes[0]?.count || 0);

    const dataSql = `
      SELECT 
        referral_id AS "referralId",
        application_id AS "applicationId",
        student_id AS "studentId",
        student_full_name AS "studentFullName",
        student_contact_email AS "studentContactEmail",
        student_contact_number AS "studentContactNumber",
        opportunity_id AS "opportunityId",
        opportunity_title AS "opportunityTitle",
        company_id AS "companyId",
        company_name AS "companyName",
        referred_at AS "referredAt",
        referral_status AS "referralStatus",
        company_response AS "companyResponse",
        company_responded_at AS "companyRespondedAt",
        student_response AS "studentResponse",
        student_responded_at AS "studentRespondedAt",
        referral_remark AS "referralRemark",
        peso_personnel_id AS "pesoPersonnelId",
        peso_personnel_full_name AS "pesoPersonnelFullName",
        interview_id AS "interviewId",
        scheduled_at AS "interviewScheduledAt",
        interview_mode AS "interviewMode",
        internship_assignment_id AS "internshipAssignmentId",
        assignment_status AS "assignmentStatus"
      FROM public.vw_referral_details rd
      ${whereSql}
      ORDER BY referred_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const data = await this.dataSource.query(dataSql, [
      ...params,
      limit,
      offset,
    ]);
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

  // D1. GET students with DTR entries (student-level aggregation)
  async getStudentsWithDtr(
    dateFilterDto: DateFilterDto,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    return this.attendanceQuery.getInternsSummary(dateFilterDto, paginationDto);
  }

  // D2. GET DTR dashboard details/metrics
  async getDtrDashboardMetrics(): Promise<PesoDtrDashboardMetricsDto> {
    const overtimeSql = `
      SELECT COUNT(DISTINCT ia.internship_assignment_id) AS count
      FROM public.attendance_record ar
      JOIN public.internship_assignment ia ON ia.internship_assignment_id = ar.internship_assignment_id
      WHERE ar.rendered_hours_status = 'overtime'
        AND ia.deleted_at IS NULL
    `;
    const overtimeRes = await this.dataSource.query(overtimeSql);
    const applicantsOvertime = Number(overtimeRes[0]?.count || 0);

    const pendingSql = `
      SELECT COUNT(*) AS count 
      FROM public.application 
      WHERE application_status IN ('submitted', 'under_review')
    `;
    const pendingRes = await this.dataSource.query(pendingSql);
    const pendingReview = Number(pendingRes[0]?.count || 0);

    const acceptedSql = `
      SELECT COUNT(*) AS count 
      FROM public.referral 
      WHERE company_response = 'accepted'
    `;
    const acceptedRes = await this.dataSource.query(acceptedSql);
    const accepted = Number(acceptedRes[0]?.count || 0);

    const shortlistedSql = `
      SELECT COUNT(*) AS count 
      FROM public.referral 
      WHERE company_response = 'for_interview'
    `;
    const shortlistedRes = await this.dataSource.query(shortlistedSql);
    const shortlisted = Number(shortlistedRes[0]?.count || 0);

    const rejectedSql = `
      SELECT COUNT(*) AS count 
      FROM public.referral 
      WHERE company_response = 'rejected'
    `;
    const rejectedRes = await this.dataSource.query(rejectedSql);
    const rejected = Number(rejectedRes[0]?.count || 0);

    return {
      applicantsOvertime,
      pendingReview,
      accepted,
      shortlisted,
      rejected,
    };
  }

  // D3. GET all DTR entries
  async getAllDtrEntries(
    queryDto: QueryAttendanceDto,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    return this.attendanceQuery.getAllDtrEntries(queryDto, paginationDto);
  }

  // D4. GET DTR entry per student
  async getDtrPerStudent(
    assignmentId: number,
    dateFilterDto: DateFilterDto,
  ): Promise<any> {
    return this.attendanceQuery.getAssignmentDtrDetail(
      assignmentId,
      dateFilterDto,
    );
  }

  // Direct Detail / Monitor Reads
  async getApplicationDetail(applicationId: number) {
    const rows = await this.dataSource.query(
      `
        SELECT 
          ad.*,
          s.birth_date,
          s.sex,
          s.address_line,
          s.address_barangay,
          s.address_district,
          s.address_city,
          s.photo_file_path,
          s.updated_at AS profile_updated_at,
          ip.required_hours AS student_required_hours,
          ip.available_days AS student_available_days,
          ip.start_date::text AS student_start_date
        FROM public.vw_application_details ad
        JOIN public.student s ON s.student_id = ad.student_id
        LEFT JOIN public.internship_preference ip ON ip.student_id = ad.student_id
        WHERE ad.application_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM public.application_visibility av
            WHERE av.application_id = ad.application_id
              AND av.qc_peso_hidden_at IS NOT NULL
          )
      `,
      [applicationId],
    );
    if (!rows || rows.length === 0) {
      throw new Error('Application not found');
    }
    const app = rows[0];

    const requirements = await this.dataSource.query(
      `
        SELECT 
          srs.student_requirement_submission_id,
          srs.requirement_name,
          srs.requirement_file_path,
          srs.submitted_at,
          rt.requirement_type_name
        FROM public.student_requirement_submission srs
        JOIN public.requirement_type rt ON rt.requirement_type_id = srs.requirement_type_id
        WHERE srs.student_id = $1
      `,
      [app.student_id],
    );

    return {
      ...app,
      requirements,
    };
  }

  private formatYearLevel(val?: string | null): string {
    if (!val) return 'College';
    const labels: Record<string, string> = {
      grade_11: 'Grade 11',
      grade_12: 'Grade 12',
      first_year_college: '1st Year College',
      second_year_college: '2nd Year College',
      third_year_college: '3rd Year College',
      fourth_year_college: '4th Year College',
      fifth_year_college: '5th Year College',
    };
    const key = val.toLowerCase().trim();
    if (labels[key]) return labels[key];
    return val
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  async markApplicationUnderReview(
    userAccountId: number,
    applicationId: number,
  ) {
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const rows = await runner.query(
        `SELECT application_status
         FROM public.application
         WHERE application_id = $1
         FOR UPDATE`,
        [applicationId],
      );
      if (!rows[0]) throw new NotFoundException('Application not found');
      if (rows[0].application_status === 'submitted') {
        await runner.query(
          `UPDATE public.application
           SET application_status = 'under_review', updated_at = CURRENT_TIMESTAMP
           WHERE application_id = $1`,
          [applicationId],
        );
      } else if (rows[0].application_status !== 'under_review') {
        throw new ConflictException(
          `Application is already in '${rows[0].application_status}' status.`,
        );
      }
    });
    return this.getApplicationDetail(applicationId);
  }

  async hideApplication(userAccountId: number, applicationId: number) {
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const rows = await runner.query(
        `SELECT application_status FROM public.application
         WHERE application_id = $1 FOR UPDATE`,
        [applicationId],
      );
      if (!rows[0]) throw new NotFoundException('Application not found');
      if (
        !['rejected_for_referral', 'closed', 'withdrawn', 'expired'].includes(
          rows[0].application_status,
        )
      ) {
        throw new ConflictException(
          'Only terminal applications can be hidden.',
        );
      }
      await runner.query(
        `INSERT INTO public.application_visibility (
           application_id, qc_peso_hidden_at, qc_peso_hidden_by_user_account_id
         ) VALUES ($1, CURRENT_TIMESTAMP, $2)
         ON CONFLICT (application_id) DO UPDATE SET
           qc_peso_hidden_at = COALESCE(public.application_visibility.qc_peso_hidden_at, EXCLUDED.qc_peso_hidden_at),
           qc_peso_hidden_by_user_account_id = COALESCE(public.application_visibility.qc_peso_hidden_by_user_account_id, EXCLUDED.qc_peso_hidden_by_user_account_id)`,
        [applicationId, userAccountId],
      );
    });
    return { applicationId, hidden: true };
  }

  async hideReferral(userAccountId: number, referralId: number) {
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const rows = await runner.query(
        `SELECT referral_status FROM public.referral
         WHERE referral_id = $1 FOR UPDATE`,
        [referralId],
      );
      if (!rows[0]) throw new NotFoundException('Referral not found');
      if (
        !['closed', 'withdrawn', 'expired'].includes(rows[0].referral_status)
      ) {
        throw new ConflictException('Only terminal referrals can be hidden.');
      }
      await runner.query(
        `INSERT INTO public.referral_visibility (
           referral_id, qc_peso_hidden_at, qc_peso_hidden_by_user_account_id
         ) VALUES ($1, CURRENT_TIMESTAMP, $2)
         ON CONFLICT (referral_id) DO UPDATE SET
           qc_peso_hidden_at = COALESCE(public.referral_visibility.qc_peso_hidden_at, EXCLUDED.qc_peso_hidden_at),
           qc_peso_hidden_by_user_account_id = COALESCE(public.referral_visibility.qc_peso_hidden_by_user_account_id, EXCLUDED.qc_peso_hidden_by_user_account_id)`,
        [referralId, userAccountId],
      );
    });
    return { referralId, hidden: true };
  }

  async updateApplicationStatus(
    userAccountId: number,
    applicationId: number,
    dto: UpdateApplicationStatusDto,
  ) {
    const validStatuses = [
      ApplicationStatusFilter.APPROVED_FOR_REFERRAL,
      ApplicationStatusFilter.REJECTED_FOR_REFERRAL,
    ];
    if (!validStatuses.includes(dto.status)) {
      throw new BadRequestException(
        'Status must be approved_for_referral or rejected_for_referral',
      );
    }
    const rejectionRemark = dto.remark?.trim();
    if (
      dto.status === ApplicationStatusFilter.REJECTED_FOR_REFERRAL &&
      !rejectionRemark
    ) {
      throw new BadRequestException('A rejection remark is required.');
    }

    let pendingEmailPayload: ReferralEmailPayload | null = null;

    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const pesoRows = await runner.query(
        `SELECT peso_personnel_id FROM public.peso_personnel WHERE user_account_id = $1`,
        [userAccountId],
      );
      let pesoPersonnelId = pesoRows[0]?.peso_personnel_id || null;

      if (!pesoPersonnelId) {
        const dummyPeso = await runner.query(
          `SELECT peso_personnel_id FROM public.peso_personnel LIMIT 1`,
        );
        pesoPersonnelId = dummyPeso[0]?.peso_personnel_id || null;
      }

      const appRows = await runner.query(
        `SELECT * FROM public.application WHERE application_id = $1 FOR UPDATE`,
        [applicationId],
      );
      if (!appRows || appRows.length === 0) {
        throw new NotFoundException('Application not found');
      }
      const currentApp = appRows[0];

      if (
        [
          'approved_for_referral',
          'rejected_for_referral',
          'closed',
          'withdrawn',
          'expired',
        ].includes(currentApp.application_status)
      ) {
        throw new ConflictException(
          `Application is already in '${currentApp.application_status}' status and cannot be modified.`,
        );
      }

      // Database trigger requires submitted -> under_review before approved/rejected
      if (currentApp.application_status === 'submitted') {
        await runner.query(
          `
            UPDATE public.application
            SET application_status = 'under_review',
                updated_at = CURRENT_TIMESTAMP
            WHERE application_id = $1
          `,
          [applicationId],
        );
      }

      await runner.query(
        `
          UPDATE public.application
          SET 
            application_status = $1::application_status_enum,
            remark = COALESCE($2, remark),
            updated_at = CURRENT_TIMESTAMP
          WHERE application_id = $3
        `,
        [dto.status, rejectionRemark || null, applicationId],
      );

      if (dto.status === ApplicationStatusFilter.APPROVED_FOR_REFERRAL) {
        const fullRows = await runner.query(
          `
            SELECT 
              a.application_id,
              a.student_id,
              a.opportunity_id,
              s.first_name AS student_first_name,
              s.middle_name AS student_middle_name,
              s.last_name AS student_last_name,
              s.extension_name AS student_extension_name,
              s.contact_email AS student_contact_email,
              s.contact_number AS student_contact_number,
              sai.school_name,
              sai.year_level,
              o.title AS opportunity_title,
              o.minimum_required_hours,
              ip.required_hours AS student_required_hours,
              c.company_id,
              c.company_name,
              c.contact_email AS company_contact_email,
              c.contact_person_first_name,
              c.contact_person_middle_name,
              c.contact_person_last_name,
              c.contact_person_extension_name,
              ua_c.email AS company_account_email
            FROM public.application a
            JOIN public.student s ON s.student_id = a.student_id
            LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
            LEFT JOIN public.internship_preference ip ON ip.student_id = s.student_id
            JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
            JOIN public.company c ON c.company_id = o.company_id
            LEFT JOIN public.user_account ua_c ON ua_c.user_account_id = c.user_account_id
            WHERE a.application_id = $1
          `,
          [applicationId],
        );

        const d = fullRows[0] || {};
        const studentFullName =
          [
            d.student_first_name,
            d.student_middle_name,
            d.student_last_name,
            d.student_extension_name,
          ]
            .filter(Boolean)
            .join(' ') || 'Student Applicant';

        const studentLastName = d.student_last_name || 'student';
        const contactPersonName =
          [
            d.contact_person_first_name,
            d.contact_person_middle_name,
            d.contact_person_last_name,
            d.contact_person_extension_name,
          ]
            .filter(Boolean)
            .join(' ') || 'HR Officer';

        const requiredHours = Number(
          d.student_required_hours || d.minimum_required_hours || 300,
        );

        const formattedYearLevel = this.formatYearLevel(d.year_level);

        const pdfResult = await this.referralPdfService.generateReferralLetter({
          studentId: d.student_id || currentApp.student_id,
          studentLastName,
          studentFullName,
          opportunityId: d.opportunity_id || currentApp.opportunity_id,
          opportunityTitle: d.opportunity_title,
          requiredHours,
          schoolName: d.school_name || 'Academic Institution',
          yearLevel: formattedYearLevel,
          companyName: d.company_name || 'Partner Company',
          contactPersonName,
          contactPersonDesignation: 'HR Officer / Representative',
        });

        const referralFilePath = pdfResult.relativeFilePath;

        await runner.query(
          `
            INSERT INTO public.referral (
              application_id, 
              peso_personnel_id, 
              referral_document_file_path, 
              referral_status,
              company_response,
              referred_at,
              updated_at
            )
            VALUES ($1, $2, $3, 'sent', 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT (application_id) DO UPDATE
            SET 
              peso_personnel_id = EXCLUDED.peso_personnel_id,
              referral_document_file_path = EXCLUDED.referral_document_file_path,
              referral_status = 'sent',
              company_response = 'pending',
              referred_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          `,
          [applicationId, pesoPersonnelId, referralFilePath],
        );

        pendingEmailPayload = {
          companyContactEmail:
            d.company_contact_email ||
            d.company_account_email ||
            'employer@example.com',
          companyAccountEmail: d.company_account_email,
          companyName: d.company_name || 'Partner Company',
          contactPersonName,
          studentName: studentFullName,
          studentEmail: d.student_contact_email,
          studentPhone: d.student_contact_number,
          schoolName: d.school_name,
          yearLevel: formattedYearLevel,
          opportunityTitle: d.opportunity_title || 'Internship Opportunity',
          opportunityId: d.opportunity_id || currentApp.opportunity_id,
          studentId: d.student_id || currentApp.student_id,
          referralPdfPath: pdfResult.absoluteFilePath,
        };
      }
    });

    if (pendingEmailPayload) {
      this.emailQueueService
        .enqueueReferralEmail(pendingEmailPayload)
        .catch((err) => {
          console.error(
            `Failed to enqueue referral email for application ${applicationId}:`,
            err,
          );
        });
    }

    return this.getApplicationDetail(applicationId);
  }

  async getReferralDetail(referralId: number) {
    const rows = await this.dataSource.query(
      `
        SELECT referral_details.*,
        s.address_line,
              s.address_barangay,
              s.address_district,
              s.address_city,
              s.birth_date,
              s.sex,
              s.photo_file_path,
              s.updated_at AS profile_updated_at
        FROM public.vw_referral_details referral_details
        JOIN public.student s ON s.student_id = referral_details.student_id
        WHERE referral_details.referral_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM public.referral_visibility rv
            WHERE rv.referral_id = referral_details.referral_id
              AND rv.qc_peso_hidden_at IS NOT NULL
          )
      `,
      [referralId],
    );
    if (!rows || rows.length === 0) {
      throw new Error('Referral not found');
    }
    const referral = rows[0];

    const requirements = await this.dataSource.query(
      `
        SELECT 
          srs.student_requirement_submission_id,
          srs.requirement_name,
          srs.requirement_file_path,
          srs.submitted_at,
          rt.requirement_type_name
        FROM public.student_requirement_submission srs
        JOIN public.requirement_type rt ON rt.requirement_type_id = srs.requirement_type_id
        WHERE srs.student_id = $1
      `,
      [referral.student_id],
    );

    return {
      ...referral,
      requirements,
    };
  }

  async getInternDetail(internshipAssignmentId: number) {
    const rows = await this.dataSource.query(
      `
        SELECT 
          iad.*,
          ats.total_rendered_hours,
          ats.attendance_record_count,
          ats.complete_count,
          ats.incomplete_count,
          ats.late_count,
          ats.undertime_count,
          ats.overtime_count,
          ats.first_attendance_date,
          ats.latest_attendance_date,
          ats.completion_percentage
        FROM public.vw_internship_assignment_details iad
        LEFT JOIN public.vw_attendance_summary ats ON ats.internship_assignment_id = iad.internship_assignment_id
        WHERE iad.internship_assignment_id = $1
      `,
      [internshipAssignmentId],
    );
    if (!rows || rows.length === 0) {
      throw new Error('Internship assignment not found');
    }
    return rows[0];
  }

  async getStudents(query: { search?: string; page?: number; limit?: number }) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [
      "ua.account_status = 'active'",
      'ua.deleted_at IS NULL',
    ];
    const params: any[] = [];
    let pIdx = 1;

    if (query.search) {
      whereClauses.push(
        `(concat_ws(' ', s.first_name, s.middle_name, s.last_name) ILIKE $${pIdx} OR s.contact_email ILIKE $${pIdx} OR s.address_city ILIKE $${pIdx})`,
      );
      params.push(`%${query.search.trim()}%`);
      pIdx++;
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await this.dataSource.query(
      `
        SELECT COUNT(s.student_id)::int as total
        FROM public.student s
        JOIN public.user_account ua ON ua.user_account_id = s.user_account_id
        ${whereSql}
      `,
      params,
    );
    const total = countRes[0]?.total ? parseInt(countRes[0].total, 10) : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const queryParams = [...params, limit, offset];
    const rows = await this.dataSource.query(
      `
        SELECT 
          s.student_id,
          s.user_account_id,
          concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS full_name,
          s.contact_email,
          s.contact_number,
          s.address_barangay,
          s.address_district,
          s.address_city,
          sai.school_name,
          sai.year_level,
          sai.strand_program,
          ua.account_status,
          s.created_at
        FROM public.student s
        JOIN public.user_account ua ON ua.user_account_id = s.user_account_id
        LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
        ${whereSql}
        ORDER BY s.created_at DESC
        LIMIT $${pIdx} OFFSET $${pIdx + 1}
      `,
      queryParams,
    );

    return {
      data: rows,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getStudentDetail(studentId: number) {
    const rows = await this.dataSource.query(
      `
        SELECT profile.*, 
          s.sex,
          s.birth_date::text AS birth_date,
          s.created_at,
          s.updated_at AS profile_updated_at
        FROM public.vw_student_profile_details profile
        JOIN public.student s ON s.student_id = profile.student_id
        WHERE profile.student_id = $1
      `,
      [studentId],
    );
    if (!rows || rows.length === 0) {
      throw new NotFoundException('Student not found');
    }
    return rows[0];
  }

  async getEmployerDetail(companyId: number) {
    const rows = await this.dataSource.query(
      `
        SELECT 
          c.*,
          i.industry_name,
          ua.email,
          ua.account_status,
          (
            SELECT count(o.opportunity_id)::int
            FROM public.opportunity o
            WHERE o.company_id = c.company_id AND o.opportunity_status = 'open'
          ) AS active_opportunity_count
        FROM public.company c
        JOIN public.industry i ON i.industry_id = c.industry_id
        JOIN public.user_account ua ON ua.user_account_id = c.user_account_id
        WHERE c.company_id = $1
      `,
      [companyId],
    );
    if (!rows || rows.length === 0) {
      throw new Error('Employer not found');
    }
    return rows[0];
  }
}
