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
  CreateAssignmentDto,
  InternshipListQueryDto,
  UpdateAssignmentDto,
} from '../dto';
import { InternshipListStatus } from '../dto';
import { EmployerCompanyResolver } from './company-resolver.service';
import {
  rawRenderedHours,
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
  time_in: string;
  time_out: string | null;
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
    const params = [company.companyId, query.studentResponse ?? null, search];
    const countRows: Array<{ total: string }> = await this.dataSource.query(
      `
        SELECT count(*)::text AS total
        FROM public.referral r
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.student s ON s.student_id = a.student_id
        WHERE o.company_id = $1
          AND r.company_response = 'accepted'
          AND (
            (r.referral_status = 'under_review'
              AND a.application_status = 'approved_for_referral'
              AND a.student_response = 'pending')
            OR
            (r.referral_status = 'closed'
              AND a.application_status = 'closed'
              AND a.student_response IN ('accepted', 'declined'))
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.referral_visibility rv
            WHERE rv.referral_id = r.referral_id
              AND rv.employer_hidden_at IS NOT NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.internship_assignment deleted_assignment
            WHERE deleted_assignment.referral_id = r.referral_id
              AND deleted_assignment.deleted_at IS NOT NULL
          )
          AND ($2::text IS NULL OR a.student_response::text = $2)
          AND ($3::text IS NULL OR concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) ILIKE '%' || $3 || '%' OR o.title ILIKE '%' || $3 || '%')
      `,
      params,
    );
    const rows: AssignmentRow[] = await this.dataSource.query(
      `
        SELECT r.referral_id, r.company_responded_at,
               a.application_id, a.student_response, a.student_responded_at,
               s.student_id,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               o.opportunity_id, o.title AS job_title,
               c.company_name, ia.internship_assignment_id
        FROM public.referral r
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.company c ON c.company_id = o.company_id
        JOIN public.student s ON s.student_id = a.student_id
        LEFT JOIN public.internship_assignment ia ON ia.referral_id = r.referral_id
        WHERE o.company_id = $1
          AND r.company_response = 'accepted'
          AND (
            (r.referral_status = 'under_review'
              AND a.application_status = 'approved_for_referral'
              AND a.student_response = 'pending')
            OR
            (r.referral_status = 'closed'
              AND a.application_status = 'closed'
              AND a.student_response IN ('accepted', 'declined'))
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.referral_visibility rv
            WHERE rv.referral_id = r.referral_id
              AND rv.employer_hidden_at IS NOT NULL
          )
          AND NOT EXISTS (
            SELECT 1 FROM public.internship_assignment deleted_assignment
            WHERE deleted_assignment.referral_id = r.referral_id
              AND deleted_assignment.deleted_at IS NOT NULL
          )
          AND ($2::text IS NULL OR a.student_response::text = $2)
          AND ($3::text IS NULL OR concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) ILIKE '%' || $3 || '%' OR o.title ILIKE '%' || $3 || '%')
        ORDER BY r.company_responded_at DESC, r.referral_id DESC
        LIMIT $4 OFFSET $5
      `,
      [...params, query.limit, (query.page - 1) * query.limit],
    );
    return paginate(
      rows.map((row) => ({
        referralId: asNumber(row.referral_id),
        applicationId: asNumber(row.application_id),
        studentId: asNumber(row.student_id),
        studentFullName: row.student_full_name,
        opportunityId: asNumber(row.opportunity_id),
        jobTitle: row.job_title,
        companyName: row.company_name,
        acceptanceDate: row.company_responded_at,
        studentResponse: row.student_response,
        studentRespondedAt: row.student_responded_at,
        internshipAssignmentId:
          row.internship_assignment_id === null
            ? null
            : asNumber(row.internship_assignment_id),
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
            SELECT r.referral_id, r.company_response, a.student_response
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
          referral.student_response !== 'accepted'
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
              referral_id, required_hours, start_date, expected_end_date,
              working_days, start_shift, end_shift, assignment_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING internship_assignment_id
          `,
          [
            referralId,
            dto.requiredHours,
            dto.startDate,
            dto.expectedEndDate ?? null,
            dto.workingDays,
            dto.startShift,
            dto.endShift,
          ],
        );
        return asNumber(inserted[0].internship_assignment_id);
      },
    );
    return this.getById(userAccountId, assignmentId);
  }

  async summary(userAccountId: number) {
    const company = await this.companyResolver.resolve(userAccountId);
    const rows = await this.loadAssignmentRows(company.companyId);
    const enriched = await this.enrichWithRenderedHours(rows);
    return {
      totalInterns: enriched.length,
      ongoingInterns: enriched.filter(
        (row) =>
          row.assignmentStatus === 'ongoing' &&
          row.renderedHours < row.requiredHours,
      ).length,
      completedInterns: enriched.filter(
        (row) => row.assignmentStatus === 'completed',
      ).length,
      awaitingCompletionInterns: enriched.filter(
        (row) =>
          row.assignmentStatus === 'ongoing' &&
          row.renderedHours >= row.requiredHours,
      ).length,
    };
  }

  async list(userAccountId: number, query: InternshipListQueryDto) {
    const company = await this.companyResolver.resolve(userAccountId);
    const rows = await this.loadAssignmentRows(
      company.companyId,
      query.search?.trim() || null,
    );
    let enriched = await this.enrichWithRenderedHours(rows);
    if (query.status) {
      enriched = enriched.filter((row) => {
        if (query.status === InternshipListStatus.AWAITING_COMPLETION) {
          return (
            row.assignmentStatus === 'ongoing' &&
            row.renderedHours >= row.requiredHours
          );
        }
        if (query.status === InternshipListStatus.ONGOING) {
          return (
            row.assignmentStatus === 'ongoing' &&
            row.renderedHours < row.requiredHours
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

  async getById(userAccountId: number, internshipAssignmentId: number) {
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
    const canDelete = ['completed', 'cancelled', 'withdrawn'].includes(
      enriched.assignmentStatus,
    );
    const canComplete =
      enriched.assignmentStatus === 'ongoing' &&
      enriched.renderedHours >= enriched.requiredHours;
    return {
      intern: {
        studentId: enriched.studentId,
        studentFullName: enriched.studentFullName,
        jobTitle: enriched.jobTitle,
        requiredHours: enriched.requiredHours,
        renderedHours: enriched.renderedHours,
        remainingHours: enriched.remainingHours,
      },
      assignment: {
        internshipAssignmentId: enriched.internshipAssignmentId,
        companyName: row.company_name,
        jobTitle: enriched.jobTitle,
        workingDays: row.working_days,
        requiredHours: enriched.requiredHours,
        startDate: row.start_date,
        expectedEndDate: row.expected_end_date,
        endDate: row.end_date,
        startShift: row.start_shift,
        endShift: row.end_shift,
      },
      status: {
        assignmentStatus: enriched.assignmentStatus,
        displayStatus: enriched.displayStatus,
        targetHours: enriched.requiredHours,
        renderedHours: enriched.renderedHours,
        remainingHours: enriched.remainingHours,
        canEdit: enriched.assignmentStatus === 'pending',
        canComplete,
        canCancel,
        canDelete,
      },
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
        workingDays: dto.workingDays ?? String(row.working_days),
        requiredHours: dto.requiredHours ?? asNumber(row.required_hours),
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
          SET working_days = $2, required_hours = $3, start_date = $4,
              expected_end_date = $5, start_shift = $6, end_shift = $7
          WHERE internship_assignment_id = $1
        `,
        [
          internshipAssignmentId,
          values.workingDays,
          values.requiredHours,
          values.startDate,
          values.expectedEndDate,
          values.startShift,
          values.endShift,
        ],
      );
    });
    return this.getById(userAccountId, internshipAssignmentId);
  }

  async cancel(userAccountId: number, internshipAssignmentId: number) {
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
        `UPDATE public.internship_assignment SET assignment_status = 'cancelled' WHERE internship_assignment_id = $1`,
        [internshipAssignmentId],
      );
    });
    return this.getById(userAccountId, internshipAssignmentId);
  }

  async complete(userAccountId: number, internshipAssignmentId: number) {
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
          SELECT internship_assignment_id, time_in, time_out
          FROM public.attendance_record
          WHERE internship_assignment_id = $1
          ORDER BY attendance_date, attendance_record_id
        `,
        [internshipAssignmentId],
      );
      const rendered = this.calculateTotal(attendance);
      if (rendered < asNumber(row.required_hours)) {
        throw new ConflictException(
          'Required rendered hours have not yet been completed.',
        );
      }
      await runner.query(
        `
          UPDATE public.internship_assignment
          SET assignment_status = 'completed', end_date = $2
          WHERE internship_assignment_id = $1
        `,
        [internshipAssignmentId, currentManilaDate()],
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
      if (
        !['completed', 'cancelled', 'withdrawn'].includes(
          String(row.assignment_status),
        )
      ) {
        throw new ConflictException(
          'Only completed, cancelled, or withdrawn assignments can be deleted.',
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
  ): Promise<AssignmentRow[]> {
    return this.dataSource.query(
      `
        SELECT ia.*,
               ia.start_date::text AS start_date,
               ia.expected_end_date::text AS expected_end_date,
               ia.end_date::text AS end_date,
               r.referral_id, a.application_id, s.student_id,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               o.opportunity_id, o.title AS job_title,
               c.company_name
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.company c ON c.company_id = o.company_id
        JOIN public.student s ON s.student_id = a.student_id
        WHERE c.company_id = $1
          AND ia.deleted_at IS NULL
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
               r.referral_id, a.application_id, s.student_id,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               o.opportunity_id, o.title AS job_title,
               c.company_name
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.company c ON c.company_id = o.company_id
        JOIN public.student s ON s.student_id = a.student_id
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
            SELECT internship_assignment_id, time_in, time_out
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
      const requiredHours = asNumber(row.required_hours);
      const renderedHours = this.calculateTotal(
        byAssignment.get(internshipAssignmentId) ?? [],
      );
      const assignmentStatus = String(row.assignment_status);
      return {
        internshipAssignmentId,
        studentId: asNumber(row.student_id),
        studentFullName: row.student_full_name,
        jobTitle: row.job_title,
        requiredHours,
        renderedHours,
        remainingHours: remainingHours(requiredHours, renderedHours),
        assignmentStatus,
        displayStatus: this.displayStatus(
          assignmentStatus,
          renderedHours,
          requiredHours,
        ),
      };
    });
  }

  private calculateTotal(attendance: AttendanceRow[]): number {
    return roundHours(
      attendance.reduce((sum, record) => {
        return (
          sum +
          rawRenderedHours(
            String(record.time_in),
            record.time_out === null ? null : String(record.time_out),
          )
        );
      }, 0),
    );
  }

  private displayStatus(
    assignmentStatus: string,
    renderedHours: number,
    requiredHours: number,
  ): string {
    if (assignmentStatus === 'ongoing' && renderedHours >= requiredHours) {
      return 'Awaiting Completion';
    }
    return (
      {
        pending: 'Pending',
        ongoing: 'On Going',
        completed: 'Completed',
        withdrawn: 'Withdrawn by Student',
        cancelled: 'Cancelled',
      }[assignmentStatus] ?? assignmentStatus
    );
  }
}
