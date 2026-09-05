import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { withStatusActor } from '../../database/status-actor.transaction';
import type {
  QcAttendanceHistoryQueryDto,
  QcAttendanceListQueryDto,
  QcInternshipListQueryDto,
} from '../dto/peso-dashboard.dto';
import { QcAssignmentStatusFilter } from '../dto/peso-dashboard.dto';
import { asNumber, paginate } from '../../employer/utils/response.utils';
import {
  remainingMinutes,
  roundHours,
} from '../../employer/utils/attendance.utils';
import {
  assertValidDate,
  currentManilaDate,
  isScheduledWorkday,
  normalizeDateOnly,
} from '../../employer/utils/time.utils';

type Row = Record<string, unknown>;

const QC_VISIBLE = `NOT EXISTS (
  SELECT 1 FROM public.internship_assignment_visibility iav
  WHERE iav.internship_assignment_id = ia.internship_assignment_id
    AND iav.qc_peso_hidden_at IS NOT NULL
)`;

@Injectable()
export class QcInternshipWorkflowService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async finalizationSummary() {
    const [row] = await this.dataSource.query(`
      SELECT count(*)::int AS awaiting_finalization,
        count(*) FILTER (WHERE assignment_status = 'complete_student')::int AS completed_internships,
        count(*) FILTER (WHERE assignment_status = 'withdrawn')::int AS withdrawal_internships,
        count(*) FILTER (WHERE assignment_status = 'cancelled')::int AS cancelled_internships
      FROM public.internship_assignment ia
      WHERE ia.deleted_at IS NULL
        AND ia.assignment_status IN ('complete_student', 'withdrawn', 'cancelled')
        AND ${QC_VISIBLE}
    `);
    return {
      awaitingFinalization: asNumber(row?.awaiting_finalization),
      completedInternships: asNumber(row?.completed_internships),
      withdrawalInternships: asNumber(row?.withdrawal_internships),
      cancelledInternships: asNumber(row?.cancelled_internships),
    };
  }

  async finalizationList(query: QcInternshipListQueryDto) {
    let rows = await this.loadRows(query.search?.trim() || null, [
      'complete_student',
      'withdrawn',
      'cancelled',
    ]);
    if (query.status)
      rows = rows.filter(
        (row) => row.assignmentStatus === String(query.status),
      );
    return this.page(rows, query);
  }

  async historySummary() {
    const [row] = await this.dataSource.query(`
      SELECT count(*)::int AS total_internships,
        count(*) FILTER (WHERE assignment_status IN ('pending', 'ongoing'))::int AS active_internships,
        count(*) FILTER (WHERE assignment_status NOT IN ('pending', 'ongoing'))::int AS closed_internships
      FROM public.internship_assignment ia
      WHERE ia.deleted_at IS NULL AND ${QC_VISIBLE}
    `);
    return {
      totalInternships: asNumber(row?.total_internships),
      activeInternships: asNumber(row?.active_internships),
      closedInternships: asNumber(row?.closed_internships),
    };
  }

  async history(query: QcInternshipListQueryDto) {
    let rows = await this.loadRows(query.search?.trim() || null);
    if (query.status) {
      rows = rows.filter((row) => {
        const isActive = ['pending', 'ongoing'].includes(row.assignmentStatus);
        if (query.status === QcAssignmentStatusFilter.ACTIVE) return isActive;
        if (query.status === QcAssignmentStatusFilter.CLOSED) return !isActive;
        return row.assignmentStatus === String(query.status);
      });
    }
    return this.page(rows, query);
  }

  async finalizationDetail(id: number) {
    return this.detail(id, ['complete_student', 'withdrawn', 'cancelled']);
  }

  async historyDetail(id: number) {
    return this.detail(id);
  }

  async finalize(userAccountId: number, id: number) {
    return withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const rows: Row[] = await runner.query(
        `SELECT internship_assignment_id, assignment_status
         FROM public.internship_assignment ia
         WHERE internship_assignment_id = $1 AND deleted_at IS NULL
           AND ${QC_VISIBLE}
         FOR UPDATE`,
        [id],
      );
      if (!rows[0])
        throw new NotFoundException('Internship assignment not found');
      if (
        !['complete_student', 'withdrawn', 'cancelled'].includes(
          String(rows[0].assignment_status),
        )
      ) {
        throw new ConflictException(
          'Only Student-complete, withdrawn, or cancelled assignments may be finalized.',
        );
      }
      const [updated] = await runner.query(
        `UPDATE public.internship_assignment
         SET assignment_status = 'finalized', finalized_at = CURRENT_TIMESTAMP,
             finalized_by_user_account_id = $2
         WHERE internship_assignment_id = $1
         RETURNING internship_assignment_id AS "internshipAssignmentId",
           assignment_status AS "assignmentStatus", ended_at AS "endedAt",
           finalized_at AS "finalizedAt",
           finalized_by_user_account_id AS "finalizedByUserAccountId"`,
        [id, userAccountId],
      );
      return updated;
    });
  }

  async hideFinalized(userAccountId: number, id: number) {
    const rows: Row[] = await this.dataSource.query(
      `SELECT internship_assignment_id FROM public.internship_assignment ia
       WHERE internship_assignment_id = $1 AND deleted_at IS NULL
         AND assignment_status = 'finalized' AND ${QC_VISIBLE}`,
      [id],
    );
    if (!rows[0])
      throw new NotFoundException('Finalized internship assignment not found');
    await this.dataSource.query(
      `INSERT INTO public.internship_assignment_visibility (
         internship_assignment_id, qc_peso_hidden_at, qc_peso_hidden_by_user_account_id
       ) VALUES ($1, CURRENT_TIMESTAMP, $2)
       ON CONFLICT (internship_assignment_id) DO UPDATE SET
         qc_peso_hidden_at = COALESCE(internship_assignment_visibility.qc_peso_hidden_at, EXCLUDED.qc_peso_hidden_at),
         qc_peso_hidden_by_user_account_id = COALESCE(internship_assignment_visibility.qc_peso_hidden_by_user_account_id, EXCLUDED.qc_peso_hidden_by_user_account_id)`,
      [id, userAccountId],
    );
    return { internshipAssignmentId: id, hidden: true };
  }

  async attendanceSummary(date = currentManilaDate()) {
    const rows = await this.dailyRows(date, null);
    return {
      ongoingInterns: rows.length,
      presentInterns: rows.filter((row) => row.status === 'present').length,
      absentInterns: rows.filter((row) => row.status === 'absent').length,
    };
  }

  async attendance(query: QcAttendanceListQueryDto) {
    const date = query.date || currentManilaDate();
    let rows = await this.dailyRows(date, query.search?.trim() || null);
    if (query.status)
      rows = rows.filter((row) => row.status === String(query.status));
    return this.page(rows, query);
  }

  async attendanceHistory(id: number, query: QcAttendanceHistoryQueryDto) {
    const detail = await this.detail(id);
    const records: Row[] = await this.dataSource.query(
      `SELECT attendance_record_id, attendance_date::text AS attendance_date,
         time_in, time_out, COALESCE(rendered_minutes, 0) AS rendered_minutes,
         attendance_status
       FROM public.attendance_record
       WHERE internship_assignment_id = $1
       ORDER BY attendance_date DESC, attendance_record_id DESC`,
      [id],
    );
    const all = records.map((row) => ({
      attendanceRecordId: asNumber(row.attendance_record_id),
      date: normalizeDateOnly(row.attendance_date),
      timeIn: row.time_in,
      timeOut: row.time_out,
      renderedMinutes: asNumber(row.rendered_minutes),
      renderedHours: roundHours(asNumber(row.rendered_minutes) / 60),
      attendanceStatus: String(row.attendance_status),
    }));
    let filtered = all;
    if (query.status)
      filtered = filtered.filter(
        (row) => row.attendanceStatus === String(query.status),
      );
    if (query.date) {
      assertValidDate(query.date);
      filtered = filtered.filter((row) => row.date === query.date);
    }
    const rendered = all.reduce((sum, row) => sum + row.renderedMinutes, 0);
    return {
      header: {
        internshipAssignmentId: id,
        studentFullName: detail.intern.studentFullName,
        studentContactEmail: detail.intern.studentContactEmail,
        studentContactNumber: detail.intern.studentContactNumber,
        studentAddress: detail.intern.studentAddress,
        studentPhotoFilePath: detail.intern.studentPhotoFilePath,
        studentProfileUpdatedAt: detail.intern.studentProfileUpdatedAt,
        strandProgram: detail.intern.strandProgram,
        jobTitle: detail.assignment.jobTitle,
        companyName: detail.assignment.companyName,
        assignmentStatus: detail.status.assignmentStatus,
      },
      summary: {
        daysPresent: all.filter((row) => row.attendanceStatus === 'present')
          .length,
        daysAbsent: all.filter((row) => row.attendanceStatus === 'absent')
          .length,
        renderedMinutes: rendered,
        remainingMinutes: remainingMinutes(
          detail.assignment.requiredMinutes,
          rendered,
        ),
      },
      history: this.page(filtered, query),
    };
  }

  private async dailyRows(date: string, search: string | null) {
    assertValidDate(date);
    if (date > currentManilaDate()) return [];
    const rows: Row[] = await this.dataSource.query(
      `SELECT ia.internship_assignment_id, ia.working_days,
         concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
         sai.strand_program, o.title AS job_title, c.company_name,
         ar.attendance_record_id, ar.time_in, ar.time_out, ar.attendance_status, ar.rendered_minutes
       FROM public.internship_assignment ia
       JOIN public.referral r ON r.referral_id = ia.referral_id
       JOIN public.application a ON a.application_id = r.application_id
       JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
       JOIN public.company c ON c.company_id = o.company_id
       JOIN public.student s ON s.student_id = a.student_id
       LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
       LEFT JOIN public.attendance_record ar ON ar.internship_assignment_id = ia.internship_assignment_id
         AND ar.attendance_date = $1::date
       WHERE ia.deleted_at IS NULL AND ia.start_date <= $1::date
         AND EXISTS (SELECT 1 FROM public.internship_assignment_status_history iash
           WHERE iash.internship_assignment_id = ia.internship_assignment_id
             AND iash.new_assignment_status = 'ongoing'
             AND (iash.changed_at AT TIME ZONE 'Asia/Manila')::date <= $1::date)
         AND (ia.ended_at IS NULL OR ia.ended_at >= (($1::date + ia.start_shift) AT TIME ZONE 'Asia/Manila'))
         AND ${QC_VISIBLE}
         AND ($2::text IS NULL OR concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) ILIKE '%' || $2 || '%'
           OR c.company_name ILIKE '%' || $2 || '%' OR o.title ILIKE '%' || $2 || '%')
       ORDER BY student_full_name, ia.internship_assignment_id`,
      [date, search],
    );
    return rows
      .filter((row) => isScheduledWorkday(date, row.working_days as number[]))
      .map((row) => {
        const renderedMinutes = asNumber(row.rendered_minutes);
        return {
          internshipAssignmentId: asNumber(row.internship_assignment_id),
          studentFullName: String(row.student_full_name),
          companyName: String(row.company_name),
          jobTitle: String(row.job_title),
          strandProgram: row.strand_program,
          date,
          status:
            row.attendance_record_id == null
              ? 'pending'
              : String(row.attendance_status),
          timeIn: row.time_in,
          timeOut: row.time_out,
          renderedMinutes,
          renderedHours: roundHours(renderedMinutes / 60),
        };
      });
  }

  private async loadRows(search: string | null, statuses?: string[]) {
    const rows: Row[] = await this.dataSource.query(
      `SELECT iad.*, COALESCE(ats.total_rendered_minutes, 0) AS total_rendered_minutes,
         s.contact_email AS profile_contact_email,
         s.contact_number AS profile_contact_number,
         concat_ws(', ', NULLIF(s.address_line, ''), NULLIF(s.address_barangay, ''), NULLIF(s.address_city, '')) AS student_address,
         s.photo_file_path AS student_photo_file_path,
         s.updated_at AS student_profile_updated_at,
         previous.previous_assignment_status
       FROM public.vw_internship_assignment_details iad
       JOIN public.internship_assignment ia ON ia.internship_assignment_id = iad.internship_assignment_id
       JOIN public.student s ON s.student_id = iad.student_id
       LEFT JOIN public.vw_attendance_summary ats ON ats.internship_assignment_id = iad.internship_assignment_id
       LEFT JOIN LATERAL (
         SELECT iash.previous_assignment_status
         FROM public.internship_assignment_status_history iash
         WHERE iash.internship_assignment_id = ia.internship_assignment_id
           AND iash.new_assignment_status = 'finalized'
         ORDER BY iash.changed_at DESC, iash.internship_assignment_status_history_id DESC LIMIT 1
       ) previous ON true
       WHERE ${QC_VISIBLE}
         AND ($1::text IS NULL OR iad.student_full_name ILIKE '%' || $1 || '%'
           OR iad.company_name ILIKE '%' || $1 || '%' OR iad.opportunity_title ILIKE '%' || $1 || '%')
       ORDER BY ia.updated_at DESC, ia.internship_assignment_id DESC`,
      [search],
    );
    const mapped = rows.map((row) => this.mapRow(row));
    return statuses
      ? mapped.filter((row) => statuses.includes(row.assignmentStatus))
      : mapped;
  }

  private async detail(id: number, statuses?: string[]) {
    const rows = await this.loadRows(null, statuses);
    const row = rows.find(
      (candidate) => candidate.internshipAssignmentId === id,
    );
    if (!row) throw new NotFoundException('Internship assignment not found');
    const effectiveStatus =
      row.assignmentStatus === 'finalized'
        ? row.previousAssignmentStatus
        : row.assignmentStatus;
    return {
      intern: {
        studentFullName: row.studentFullName,
        studentContactEmail: row.studentContactEmail,
        studentContactNumber: row.studentContactNumber,
        studentAddress: row.studentAddress,
        studentPhotoFilePath: row.studentPhotoFilePath,
        studentProfileUpdatedAt: row.studentProfileUpdatedAt,
        strandProgram: row.strandProgram,
        jobTitle: row.jobTitle,
        renderedMinutes: row.renderedMinutes,
        remainingMinutes: row.remainingMinutes,
      },
      assignment: {
        internshipAssignmentId: row.internshipAssignmentId,
        companyName: row.companyName,
        jobTitle: row.jobTitle,
        workingDays: row.workingDays,
        requiredMinutes: row.requiredMinutes,
        startDate: row.startDate,
        expectedEndDate: row.expectedEndDate,
        endDate: row.endDate,
        endedAt: row.endedAt,
        startShift: row.startShift,
        endShift: row.endShift,
        finalizedAt: row.finalizedAt,
      },
      status: {
        assignmentStatus: row.assignmentStatus,
        previousAssignmentStatus: row.previousAssignmentStatus,
        effectiveStatus,
        canFinalize: ['complete_student', 'withdrawn', 'cancelled'].includes(
          row.assignmentStatus,
        ),
        canDelete: row.assignmentStatus === 'finalized',
      },
      remarks: {
        studentWithdrawalRemark: row.studentWithdrawalRemark,
        companyCancellationRemark: row.companyCancellationRemark,
        companyReviewOfStudent: row.companyCompletionRemark,
        studentReviewOfCompany:
          row.studentReviewRating == null
            ? null
            : {
                rating: row.studentReviewRating,
                remark: row.studentReviewRemark,
                reviewedAt: row.reviewedAt,
              },
      },
      readOnly: true,
    };
  }

  private mapRow(row: Row) {
    const requiredMinutes = asNumber(row.required_minutes);
    const renderedMinutes = asNumber(row.total_rendered_minutes);
    return {
      internshipAssignmentId: asNumber(row.internship_assignment_id),
      studentFullName: row.student_full_name,
      studentContactEmail: row.profile_contact_email,
      studentContactNumber: row.profile_contact_number,
      studentAddress: row.student_address,
      studentPhotoFilePath: row.student_photo_file_path,
      studentProfileUpdatedAt: row.student_profile_updated_at,
      companyName: row.company_name,
      jobTitle: row.opportunity_title,
      strandProgram: row.strand_program,
      assignmentStatus: String(row.assignment_status),
      previousAssignmentStatus:
        typeof row.previous_assignment_status === 'string'
          ? row.previous_assignment_status
          : null,
      workingDays: row.working_days,
      requiredMinutes,
      renderedMinutes,
      remainingMinutes: remainingMinutes(requiredMinutes, renderedMinutes),
      startDate: row.start_date,
      expectedEndDate: row.expected_end_date,
      endDate: row.end_date,
      endedAt: row.ended_at,
      startShift: row.start_shift,
      endShift: row.end_shift,
      finalizedAt: row.finalized_at,
      studentWithdrawalRemark: row.student_withdrawal_remark,
      companyCancellationRemark: row.company_cancellation_remark,
      companyCompletionRemark: row.company_completion_remark,
      studentReviewRating:
        row.student_company_review_rating == null
          ? null
          : asNumber(row.student_company_review_rating),
      studentReviewRemark: row.student_company_review_remark,
      reviewedAt: row.reviewed_at,
    };
  }

  private page<T>(rows: T[], query: { page: number; limit: number }) {
    const offset = (query.page - 1) * query.limit;
    return paginate(
      rows.slice(offset, offset + query.limit),
      query.page,
      query.limit,
      rows.length,
    );
  }
}
