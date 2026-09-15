import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, QueryRunner } from 'typeorm';
import { withStatusActor } from '../../database/status-actor.transaction';
import type {
  AssignmentCandidateQueryDto,
  AssignmentRemarkDto,
  CreateAssignmentDto,
  InternshipHistoryQueryDto,
  InternshipListQueryDto,
  UpdateAssignmentDto,
} from '../dto';
import { InternshipHistoryStatus, InternshipListStatus } from '../dto';
import { EmployerCompanyResolver } from './company-resolver.service';
import {
  remainingMinutes,
  remainingHours,
  roundHours,
} from '../utils/attendance.utils';
import { asNumber, paginate } from '../utils/response.utils';
import {
  assertDateRange,
  assertShiftOrder,
  currentManilaDate,
  normalizeDateOnly,
} from '../utils/time.utils';

type AssignmentRow = Record<string, unknown>;
type AttendanceRow = {
  internship_assignment_id: number;
  rendered_minutes: number | null;
};

@Injectable()
export class EmployerInternshipService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly companyResolver: EmployerCompanyResolver,
  ) {}

  async listCandidates(
    userAccountId: number,
    query: AssignmentCandidateQueryDto,
  ) {
    const company = await this.companyResolver.resolve(userAccountId);
    const search = query.search?.trim() || null;
    const params = [company.companyId, search];
    const countRows: Array<{ total: string }> = await this.dataSource.query(
      `
        SELECT count(*)::text AS total
        FROM public.referral r
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.student s ON s.student_id = a.student_id
        WHERE o.company_id = $1
          AND r.company_response = 'accepted'
          AND a.student_response = 'accepted'
          AND a.application_status = 'closed'
          AND r.referral_status = 'closed'
          AND NOT EXISTS (
            SELECT 1 FROM public.referral_visibility rv
            WHERE rv.referral_id = r.referral_id
              AND rv.employer_hidden_at IS NOT NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.internship_assignment existing_assignment
            WHERE existing_assignment.referral_id = r.referral_id
          )
          AND ($2::text IS NULL OR concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) ILIKE '%' || $2 || '%' OR o.title ILIKE '%' || $2 || '%')
      `,
      params,
    );
    const rows: AssignmentRow[] = await this.dataSource.query(
      `
        SELECT r.referral_id,
               a.application_id, a.student_response, a.student_responded_at,
               s.student_id,
               ua.account_code AS student_account_code,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               sai.strand_program,
               o.opportunity_id, o.title AS job_title,
               c.company_name
        FROM public.referral r
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.company c ON c.company_id = o.company_id
        JOIN public.student s ON s.student_id = a.student_id
        JOIN public.user_account ua ON ua.user_account_id = s.user_account_id
        LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
        WHERE o.company_id = $1
          AND r.company_response = 'accepted'
          AND a.student_response = 'accepted'
          AND a.application_status = 'closed'
          AND r.referral_status = 'closed'
          AND NOT EXISTS (
            SELECT 1 FROM public.referral_visibility rv
            WHERE rv.referral_id = r.referral_id
              AND rv.employer_hidden_at IS NOT NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.internship_assignment existing_assignment
            WHERE existing_assignment.referral_id = r.referral_id
          )
          AND ($2::text IS NULL OR concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) ILIKE '%' || $2 || '%' OR o.title ILIKE '%' || $2 || '%')
        ORDER BY a.student_responded_at DESC, r.referral_id DESC
        LIMIT $3 OFFSET $4
      `,
      [...params, query.limit, (query.page - 1) * query.limit],
    );
    return paginate(
      rows.map((row) => ({
        referralId: asNumber(row.referral_id),
        applicationId: asNumber(row.application_id),
        studentId: asNumber(row.student_id),
        studentAccountCode: row.student_account_code,
        studentFullName: row.student_full_name,
        strandProgram: row.strand_program,
        opportunityId: asNumber(row.opportunity_id),
        jobTitle: row.job_title,
        companyName: row.company_name,
        acceptanceDate: row.student_responded_at,
        studentResponse: row.student_response,
        studentRespondedAt: row.student_responded_at,
        internshipAssignmentId: null,
      })),
      query.page,
      query.limit,
      asNumber(countRows[0]?.total),
    );
  }

  async createAssignment(
    userAccountId: number,
    referralId: number,
    dto: CreateAssignmentDto,
  ) {
    this.validateAssignmentInput(dto);
    if (dto.startDate < currentManilaDate()) {
      throw new ConflictException('startDate cannot be in the past.');
    }
    const company = await this.companyResolver.resolve(userAccountId);
    const assignmentId = await withStatusActor(
      this.dataSource,
      userAccountId,
      async (runner) => {
        const referrals: AssignmentRow[] = await runner.query(
          `
            SELECT r.referral_id, r.referral_status, r.company_response,
                   a.application_status, a.student_response
            FROM public.referral r
            JOIN public.application a ON a.application_id = r.application_id
            JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
            WHERE r.referral_id = $1 AND o.company_id = $2
            FOR UPDATE OF r
          `,
          [referralId, company.companyId],
        );
        const referral = referrals[0];
        if (!referral) throw new NotFoundException('Referral not found');
        if (
          referral.company_response !== 'accepted' ||
          referral.student_response !== 'accepted' ||
          referral.application_status !== 'closed' ||
          referral.referral_status !== 'closed'
        ) {
          throw new ConflictException(
            'Assignment creation requires employer and student acceptance.',
          );
        }
        const existing: AssignmentRow[] = await runner.query(
          `SELECT internship_assignment_id FROM public.internship_assignment WHERE referral_id = $1`,
          [referralId],
        );
        if (existing[0]) {
          throw new ConflictException(
            'An internship assignment already exists for this referral.',
          );
        }
        const inserted: AssignmentRow[] = await runner.query(
          `
            INSERT INTO public.internship_assignment (
              referral_id, required_minutes, start_date, expected_end_date,
              working_days, start_shift, end_shift, assignment_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING internship_assignment_id
          `,
          [
            referralId,
            dto.requiredHours * 60,
            dto.startDate,
            dto.expectedEndDate ?? null,
            dto.workingDays,
            dto.startShift,
            dto.endShift,
          ],
        );
        const insertedId = asNumber(inserted[0].internship_assignment_id);
        if (dto.startDate === currentManilaDate()) {
          await runner.query(
            `UPDATE public.internship_assignment
             SET assignment_status = 'ongoing'
             WHERE internship_assignment_id = $1
               AND assignment_status = 'pending'`,
            [insertedId],
          );
        }
        return insertedId;
      },
    );
    return this.getById(userAccountId, assignmentId);
  }

  async summary(userAccountId: number) {
    const company = await this.companyResolver.resolve(userAccountId);
    const rows = await this.loadAssignmentRows(company.companyId, null, true);
    const enriched = await this.enrichWithRenderedHours(rows);
    const pendingInternships = enriched.filter(
      (row) => row.assignmentStatus === 'pending',
    ).length;
    const ongoingInternships = enriched.filter(
      (row) =>
        row.assignmentStatus === 'ongoing' &&
        row.renderedMinutes < row.requiredMinutes,
    ).length;
    const awaitingCompletion = enriched.filter(
      (row) =>
        row.assignmentStatus === 'ongoing' &&
        row.renderedMinutes >= row.requiredMinutes,
    ).length;
    return {
      activeInternships: enriched.length,
      pendingInternships,
      ongoingInternships,
      awaitingCompletion,
    };
  }

  async list(userAccountId: number, query: InternshipListQueryDto) {
    const company = await this.companyResolver.resolve(userAccountId);
    const rows = await this.loadAssignmentRows(
      company.companyId,
      query.search?.trim() || null,
      true,
    );
    let enriched = await this.enrichWithRenderedHours(rows);
    if (query.status) {
      enriched = enriched.filter((row) => {
        if (query.status === InternshipListStatus.AWAITING_COMPLETION) {
          return (
            row.assignmentStatus === 'ongoing' &&
            row.renderedMinutes >= row.requiredMinutes
          );
        }
        if (query.status === InternshipListStatus.ONGOING) {
          return (
            row.assignmentStatus === 'ongoing' &&
            row.renderedMinutes < row.requiredMinutes
          );
        }
        return row.assignmentStatus === String(query.status);
      });
    }
    const total = enriched.length;
    const offset = (query.page - 1) * query.limit;
    return paginate(
      enriched.slice(offset, offset + query.limit),
      query.page,
      query.limit,
      total,
    );
  }

  async historySummary(userAccountId: number) {
    const company = await this.companyResolver.resolve(userAccountId);
    const rows = await this.loadAssignmentRows(company.companyId);
    const activeInternships = rows.filter((row) =>
      ['pending', 'ongoing'].includes(String(row.assignment_status)),
    ).length;
    return {
      totalInternships: rows.length,
      activeInternships,
      closedInternships: rows.length - activeInternships,
    };
  }

  async history(userAccountId: number, query: InternshipHistoryQueryDto) {
    const company = await this.companyResolver.resolve(userAccountId);
    const rows = await this.loadAssignmentRows(
      company.companyId,
      query.search?.trim() || null,
    );
    let enriched = await this.enrichWithRenderedHours(rows);
    if (query.status) {
      enriched = enriched.filter((row) => {
        const isActive = ['pending', 'ongoing'].includes(row.assignmentStatus);
        if (query.status === InternshipHistoryStatus.ACTIVE) return isActive;
        if (query.status === InternshipHistoryStatus.CLOSED) return !isActive;
        return row.assignmentStatus === String(query.status);
      });
    }
    const total = enriched.length;
    const offset = (query.page - 1) * query.limit;
    return paginate(
      enriched.slice(offset, offset + query.limit),
      query.page,
      query.limit,
      total,
    );
  }

  async getById(userAccountId: number, internshipAssignmentId: number) {
    return this.getDetail(userAccountId, internshipAssignmentId, false);
  }

  async getHistoryById(userAccountId: number, internshipAssignmentId: number) {
    return this.getDetail(userAccountId, internshipAssignmentId, true);
  }

  private async getDetail(
    userAccountId: number,
    internshipAssignmentId: number,
    readOnly: boolean,
  ) {
    const company = await this.companyResolver.resolve(userAccountId);
    const row = await this.findAssignmentScoped(
      this.dataSource,
      company.companyId,
      internshipAssignmentId,
    );
    const [enriched] = await this.enrichWithRenderedHours([row]);
    const canCancel = ['pending', 'ongoing'].includes(
      enriched.assignmentStatus,
    );
    const canDelete = enriched.assignmentStatus === 'finalized';
    const canComplete =
      enriched.assignmentStatus === 'ongoing' &&
      enriched.renderedMinutes >= enriched.requiredMinutes;
    return {
      intern: {
        studentId: enriched.studentId,
        studentFullName: enriched.studentFullName,
        studentContactEmail: row.student_contact_email,
        studentContactNumber: row.student_contact_number,
        studentAddress: row.student_address,
        studentPhotoFilePath: row.student_photo_file_path,
        studentProfileUpdatedAt: row.student_profile_updated_at,
        strandProgram: enriched.strandProgram,
        yearLevel: row.year_level,
        schoolName: row.school_name,
        jobTitle: enriched.jobTitle,
        requiredHours: enriched.requiredHours,
        requiredMinutes: enriched.requiredMinutes,
        renderedHours: enriched.renderedHours,
        renderedMinutes: enriched.renderedMinutes,
        remainingHours: enriched.remainingHours,
        remainingMinutes: enriched.remainingMinutes,
      },
      assignment: {
        internshipAssignmentId: enriched.internshipAssignmentId,
        companyName: row.company_name,
        jobTitle: enriched.jobTitle,
        workingDays: row.working_days,
        requiredHours: enriched.requiredHours,
        requiredMinutes: enriched.requiredMinutes,
        startDate: row.start_date,
        expectedEndDate: row.expected_end_date,
        endDate: row.end_date,
        endedAt: row.ended_at,
        startShift: row.start_shift,
        endShift: row.end_shift,
      },
      status: {
        assignmentStatus: enriched.assignmentStatus,
        displayStatus: enriched.displayStatus,
        targetHours: enriched.requiredHours,
        targetMinutes: enriched.requiredMinutes,
        renderedHours: enriched.renderedHours,
        renderedMinutes: enriched.renderedMinutes,
        remainingHours: enriched.remainingHours,
        remainingMinutes: enriched.remainingMinutes,
        canEdit: !readOnly && enriched.assignmentStatus === 'pending',
        canComplete: !readOnly && canComplete,
        canCancel: !readOnly && canCancel,
        canDelete: readOnly && canDelete,
      },
      remarks: {
        studentWithdrawalRemark: row.student_withdrawal_remark,
        companyCancellationRemark: row.company_cancellation_remark,
        companyCompletionRemark: row.company_completion_remark,
      },
      readOnly,
    };
  }

  async update(
    userAccountId: number,
    internshipAssignmentId: number,
    dto: UpdateAssignmentDto,
  ) {
    const company = await this.companyResolver.resolve(userAccountId);
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const row = await this.findAssignmentScoped(
        runner,
        company.companyId,
        internshipAssignmentId,
        true,
      );
      if (row.assignment_status !== 'pending') {
        throw new ConflictException('Only pending assignments can be edited.');
      }
      const values = {
        workingDays: dto.workingDays ?? (row.working_days as number[]),
        requiredHours: dto.requiredHours ?? asNumber(row.required_minutes) / 60,
        startDate:
          dto.startDate ?? normalizeDateOnly(row.start_date, 'startDate'),
        expectedEndDate:
          dto.expectedEndDate === undefined
            ? row.expected_end_date === null
              ? null
              : normalizeDateOnly(row.expected_end_date, 'expectedEndDate')
            : dto.expectedEndDate,
        startShift: dto.startShift ?? String(row.start_shift).slice(0, 5),
        endShift: dto.endShift ?? String(row.end_shift).slice(0, 5),
      };
      this.validateAssignmentInput(values);
      if (values.startDate < currentManilaDate()) {
        throw new ConflictException('startDate cannot be in the past.');
      }
      await runner.query(
        `
          UPDATE public.internship_assignment
          SET working_days = $2, required_minutes = $3, start_date = $4,
              expected_end_date = $5, start_shift = $6, end_shift = $7
          WHERE internship_assignment_id = $1
        `,
        [
          internshipAssignmentId,
          values.workingDays,
          values.requiredHours * 60,
          values.startDate,
          values.expectedEndDate,
          values.startShift,
          values.endShift,
        ],
      );
    });
    return this.getById(userAccountId, internshipAssignmentId);
  }

  async cancel(
    userAccountId: number,
    internshipAssignmentId: number,
    dto: AssignmentRemarkDto,
  ) {
    const company = await this.companyResolver.resolve(userAccountId);
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const row = await this.findAssignmentScoped(
        runner,
        company.companyId,
        internshipAssignmentId,
        true,
      );
      if (!['pending', 'ongoing'].includes(String(row.assignment_status))) {
        throw new ConflictException(
          'Only pending or ongoing assignments can be cancelled.',
        );
      }
      await runner.query(
        `UPDATE public.internship_assignment
         SET assignment_status = 'cancelled',
             company_cancellation_remark = $2,
             ended_at = CURRENT_TIMESTAMP,
             end_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date
         WHERE internship_assignment_id = $1`,
        [internshipAssignmentId, dto.remark.trim()],
      );
    });
    return this.getById(userAccountId, internshipAssignmentId);
  }

  async complete(
    userAccountId: number,
    internshipAssignmentId: number,
    dto: AssignmentRemarkDto,
  ) {
    const company = await this.companyResolver.resolve(userAccountId);
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const row = await this.findAssignmentScoped(
        runner,
        company.companyId,
        internshipAssignmentId,
        true,
      );
      if (row.assignment_status !== 'ongoing') {
        throw new ConflictException(
          'Only ongoing assignments can be completed.',
        );
      }
      const attendance: AttendanceRow[] = await runner.query(
        `
          SELECT internship_assignment_id, rendered_minutes
          FROM public.attendance_record
          WHERE internship_assignment_id = $1
          ORDER BY attendance_date, attendance_record_id
        `,
        [internshipAssignmentId],
      );
      const rendered = this.calculateTotal(attendance);
      if (rendered < asNumber(row.required_minutes)) {
        throw new ConflictException(
          'Required rendered minutes have not yet been completed.',
        );
      }
      await runner.query(
        `
          UPDATE public.internship_assignment
          SET assignment_status = 'complete_company',
              company_completion_remark = $2,
              ended_at = CURRENT_TIMESTAMP,
              end_date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date
          WHERE internship_assignment_id = $1
        `,
        [internshipAssignmentId, dto.remark.trim()],
      );
    });
    return this.getById(userAccountId, internshipAssignmentId);
  }

  async softDelete(userAccountId: number, internshipAssignmentId: number) {
    const company = await this.companyResolver.resolve(userAccountId);
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const row = await this.findAssignmentScoped(
        runner,
        company.companyId,
        internshipAssignmentId,
        true,
        true,
      );
      if (row.assignment_status !== 'finalized') {
        throw new ConflictException(
          'Only finalized assignments can be hidden.',
        );
      }
      await runner.query(
        `INSERT INTO public.internship_assignment_visibility (
           internship_assignment_id, employer_hidden_at,
           employer_hidden_by_user_account_id
         ) VALUES ($1, CURRENT_TIMESTAMP, $2)
         ON CONFLICT (internship_assignment_id) DO UPDATE SET
           employer_hidden_at = COALESCE(public.internship_assignment_visibility.employer_hidden_at, EXCLUDED.employer_hidden_at),
           employer_hidden_by_user_account_id = COALESCE(public.internship_assignment_visibility.employer_hidden_by_user_account_id, EXCLUDED.employer_hidden_by_user_account_id)`,
        [internshipAssignmentId, userAccountId],
      );
    });
    return { internshipAssignmentId, deleted: true };
  }

  private validateAssignmentInput(dto: {
    startDate: string;
    expectedEndDate?: string | null;
    startShift: string;
    endShift: string;
  }): void {
    assertDateRange(dto.startDate, dto.expectedEndDate);
    assertShiftOrder(dto.startShift, dto.endShift);
  }

  private async loadAssignmentRows(
    companyId: number,
    search: string | null = null,
    activeOnly = false,
  ): Promise<AssignmentRow[]> {
    return this.dataSource.query(
      `
        SELECT ia.*,
               ia.start_date::text AS start_date,
               ia.expected_end_date::text AS expected_end_date,
               ia.end_date::text AS end_date,
               ia.ended_at,
               r.referral_id, a.application_id, s.student_id,
               ua.account_code AS student_account_code,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               sai.strand_program,
               o.opportunity_id, o.title AS job_title,
               c.company_name
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.company c ON c.company_id = o.company_id
        JOIN public.student s ON s.student_id = a.student_id
        JOIN public.user_account ua ON ua.user_account_id = s.user_account_id
        LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
        WHERE c.company_id = $1
          AND ia.deleted_at IS NULL
          ${activeOnly ? "AND ia.assignment_status IN ('pending', 'ongoing')" : ''}
          AND NOT EXISTS (
            SELECT 1 FROM public.internship_assignment_visibility iav
            WHERE iav.internship_assignment_id = ia.internship_assignment_id
              AND iav.employer_hidden_at IS NOT NULL
          )
          AND ($2::text IS NULL OR concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) ILIKE '%' || $2 || '%' OR o.title ILIKE '%' || $2 || '%')
        ORDER BY ia.created_at DESC, ia.internship_assignment_id DESC
      `,
      [companyId, search],
    );
  }

  private async findAssignmentScoped(
    executor: Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>,
    companyId: number,
    internshipAssignmentId: number,
    forUpdate = false,
    includeHidden = false,
  ): Promise<AssignmentRow> {
    const rows: AssignmentRow[] = await executor.query(
      `
        SELECT ia.*,
               ia.start_date::text AS start_date,
               ia.expected_end_date::text AS expected_end_date,
               ia.end_date::text AS end_date,
               ia.ended_at,
               r.referral_id, a.application_id, s.student_id,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               s.contact_email AS student_contact_email,
               s.contact_number AS student_contact_number,
               concat_ws(', ', NULLIF(s.address_line, ''), NULLIF(s.address_barangay, ''), NULLIF(s.address_city, '')) AS student_address,
               s.photo_file_path AS student_photo_file_path,
               s.updated_at AS student_profile_updated_at,
               sai.school_name, sai.year_level, sai.strand_program,
               o.opportunity_id, o.title AS job_title,
               c.company_name
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.company c ON c.company_id = o.company_id
        JOIN public.student s ON s.student_id = a.student_id
        LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
        WHERE ia.internship_assignment_id = $1 AND c.company_id = $2
          AND ia.deleted_at IS NULL
          ${
            includeHidden
              ? ''
              : `AND NOT EXISTS (
            SELECT 1 FROM public.internship_assignment_visibility iav
            WHERE iav.internship_assignment_id = ia.internship_assignment_id
              AND iav.employer_hidden_at IS NOT NULL
          )`
          }
        ${forUpdate ? 'FOR UPDATE OF ia' : ''}
      `,
      [internshipAssignmentId, companyId],
    );
    if (!rows[0])
      throw new NotFoundException('Internship assignment not found');
    return rows[0];
  }

  private async enrichWithRenderedHours(rows: AssignmentRow[]) {
    const ids = rows.map((row) => asNumber(row.internship_assignment_id));
    const attendance: AttendanceRow[] = ids.length
      ? await this.dataSource.query(
          `
            SELECT internship_assignment_id, rendered_minutes
            FROM public.attendance_record
            WHERE internship_assignment_id = ANY($1::integer[])
            ORDER BY attendance_date, attendance_record_id
          `,
          [ids],
        )
      : [];
    const byAssignment = new Map<number, AttendanceRow[]>();
    for (const record of attendance) {
      const id = asNumber(record.internship_assignment_id);
      byAssignment.set(id, [...(byAssignment.get(id) ?? []), record]);
    }
    return rows.map((row) => {
      const internshipAssignmentId = asNumber(row.internship_assignment_id);
      const requiredMinutes = asNumber(row.required_minutes);
      const renderedMinutes = this.calculateTotal(
        byAssignment.get(internshipAssignmentId) ?? [],
      );
      const requiredHours = requiredMinutes / 60;
      const renderedHours = roundHours(renderedMinutes / 60);
      const assignmentStatus = String(row.assignment_status);
      return {
        internshipAssignmentId,
        studentId: asNumber(row.student_id),
        studentAccountCode: row.student_account_code,
        studentFullName: row.student_full_name,
        strandProgram: row.strand_program ?? null,
        jobTitle: row.job_title,
        startDate: row.start_date,
        expectedEndDate: row.expected_end_date,
        endDate: row.end_date,
        requiredHours,
        requiredMinutes,
        renderedHours,
        renderedMinutes,
        remainingHours: remainingHours(requiredHours, renderedHours),
        remainingMinutes: remainingMinutes(requiredMinutes, renderedMinutes),
        assignmentStatus,
        displayStatus: this.displayStatus(
          assignmentStatus,
          renderedMinutes,
          requiredMinutes,
        ),
      };
    });
  }

  private calculateTotal(attendance: AttendanceRow[]): number {
    return attendance.reduce(
      (sum, record) => sum + asNumber(record.rendered_minutes),
      0,
    );
  }

  private displayStatus(
    assignmentStatus: string,
    renderedMinutes: number,
    requiredMinutes: number,
  ): string {
    if (assignmentStatus === 'ongoing' && renderedMinutes >= requiredMinutes) {
      return 'Awaiting Completion';
    }
    return (
      {
        pending: 'Pending',
        ongoing: 'Ongoing',
        complete_company: 'Complete (Company)',
        complete_student: 'Complete (Student)',
        withdrawn: 'Withdrawn',
        cancelled: 'Cancelled',
        finalized: 'Finalized',
      }[assignmentStatus] ?? assignmentStatus
    );
  }
}
