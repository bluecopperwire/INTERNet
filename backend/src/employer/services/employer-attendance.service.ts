import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type {
  AttendanceDateQueryDto,
  AttendanceHistoryQueryDto,
  AttendanceListQueryDto,
} from '../dto';
import { EmployerCompanyResolver } from './company-resolver.service';
import { remainingMinutes, roundHours } from '../utils/attendance.utils';
import { asNumber, paginate } from '../utils/response.utils';
import {
  assertValidDate,
  currentManilaDate,
  isScheduledWorkday,
  normalizeDateOnly,
} from '../utils/time.utils';

type AttendanceContextRow = Record<string, unknown>;

export type MonitoringAttendanceStatus =
  'pending' | 'present' | 'absent' | 'incomplete';

export interface DailyAttendanceRow {
  internshipAssignmentId: number;
  studentId: number;
  studentFullName: string;
  jobTitle: string;
  strandProgram: string | null;
  date: string;
  status: MonitoringAttendanceStatus;
  timeIn: string | null;
  timeOut: string | null;
  renderedMinutes: number;
  renderedHours: number;
}

/** Shared with the future QC PESO monitor: lifecycle history is authoritative. */
export const HISTORICAL_ONGOING_ASSIGNMENT_PREDICATE = `
  ia.start_date <= $2::date
  AND EXISTS (
    SELECT 1
    FROM public.internship_assignment_status_history iash
    WHERE iash.internship_assignment_id = ia.internship_assignment_id
      AND iash.new_assignment_status = 'ongoing'
      AND (iash.changed_at AT TIME ZONE 'Asia/Manila')::date <= $2::date
  )
  AND (
    ia.ended_at IS NULL
    OR ia.ended_at >= (($2::date + ia.start_shift) AT TIME ZONE 'Asia/Manila')
  )
`;

@Injectable()
export class EmployerAttendanceService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly companyResolver: EmployerCompanyResolver,
  ) {}

  async summary(userAccountId: number, query: AttendanceDateQueryDto) {
    const rows = await this.dailyRows(
      userAccountId,
      query.date ?? currentManilaDate(),
      null,
    );
    return {
      ongoingInterns: rows.length,
      presentInterns: rows.filter((row) => row.status === 'present').length,
      absentInterns: rows.filter((row) => row.status === 'absent').length,
    };
  }

  async list(userAccountId: number, query: AttendanceListQueryDto) {
    const date = query.date ?? currentManilaDate();
    let rows = await this.dailyRows(
      userAccountId,
      date,
      query.search?.trim() || null,
    );
    if (query.status) {
      rows = rows.filter((row) => row.status === String(query.status));
    }
    const total = rows.length;
    const offset = (query.page - 1) * query.limit;
    return paginate(
      rows.slice(offset, offset + query.limit),
      query.page,
      query.limit,
      total,
    );
  }

  async history(
    userAccountId: number,
    internshipAssignmentId: number,
    query: AttendanceHistoryQueryDto = { page: 1, limit: 10 },
  ) {
    const company = await this.companyResolver.resolve(userAccountId);
    const assignments: AttendanceContextRow[] = await this.dataSource.query(
      `
        SELECT ia.internship_assignment_id, ia.required_minutes,
               ia.assignment_status, s.student_id,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               s.contact_email AS student_contact_email,
               s.contact_number AS student_contact_number,
               concat_ws(', ', NULLIF(s.address_line, ''), NULLIF(s.address_barangay, ''), NULLIF(s.address_city, '')) AS student_address,
               s.photo_file_path AS student_photo_file_path,
               s.updated_at AS student_profile_updated_at,
               sai.strand_program, o.title AS job_title, c.company_name
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.company c ON c.company_id = o.company_id
        JOIN public.student s ON s.student_id = a.student_id
        LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
        WHERE ia.internship_assignment_id = $1 AND o.company_id = $2
          AND ia.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM public.internship_assignment_visibility iav
            WHERE iav.internship_assignment_id = ia.internship_assignment_id
              AND iav.employer_hidden_at IS NOT NULL
          )
      `,
      [internshipAssignmentId, company.companyId],
    );
    const assignment = assignments[0];
    if (!assignment) {
      throw new NotFoundException('Internship assignment not found');
    }

    const records: AttendanceContextRow[] = await this.dataSource.query(
      `
        SELECT attendance_record_id, attendance_date::text AS attendance_date,
               time_in, time_out, rendered_minutes, attendance_status
        FROM public.attendance_record
        WHERE internship_assignment_id = $1
        ORDER BY attendance_date DESC, attendance_record_id DESC
      `,
      [internshipAssignmentId],
    );
    const allHistory = records.map((record) => {
      const recordRenderedMinutes = asNumber(record.rendered_minutes);
      return {
        attendanceRecordId: asNumber(record.attendance_record_id),
        date: normalizeDateOnly(record.attendance_date, 'attendanceDate'),
        timeIn: record.time_in,
        timeOut: record.time_out,
        renderedHours: roundHours(recordRenderedMinutes / 60),
        renderedMinutes: recordRenderedMinutes,
        attendanceStatus: String(record.attendance_status),
      };
    });
    const renderedMinutes = allHistory.reduce(
      (total, record) => total + record.renderedMinutes,
      0,
    );
    const requiredMinutes = asNumber(assignment.required_minutes);
    let filtered = allHistory;
    if (query.status) {
      filtered = filtered.filter(
        (record) => record.attendanceStatus === String(query.status),
      );
    }
    if (query.date) {
      assertValidDate(query.date);
      filtered = filtered.filter((record) => record.date === query.date);
    }
    const total = filtered.length;
    const offset = (query.page - 1) * query.limit;

    return {
      header: {
        internshipAssignmentId,
        studentFullName: assignment.student_full_name,
        studentContactEmail: assignment.student_contact_email,
        studentContactNumber: assignment.student_contact_number,
        studentAddress: assignment.student_address,
        studentPhotoFilePath: assignment.student_photo_file_path,
        studentProfileUpdatedAt: assignment.student_profile_updated_at,
        strandProgram: assignment.strand_program,
        jobTitle: assignment.job_title,
        companyName: assignment.company_name,
        assignmentStatus: assignment.assignment_status,
      },
      summary: {
        daysPresent: allHistory.filter(
          (record) => record.attendanceStatus === 'present',
        ).length,
        daysAbsent: allHistory.filter(
          (record) => record.attendanceStatus === 'absent',
        ).length,
        renderedMinutes,
        remainingMinutes: remainingMinutes(requiredMinutes, renderedMinutes),
      },
      history: paginate(
        filtered.slice(offset, offset + query.limit),
        query.page,
        query.limit,
        total,
      ),
    };
  }

  private async dailyRows(
    userAccountId: number,
    date: string,
    search: string | null,
  ): Promise<DailyAttendanceRow[]> {
    assertValidDate(date);
    if (date > currentManilaDate()) return [];
    const company = await this.companyResolver.resolve(userAccountId);
    const rows: AttendanceContextRow[] = await this.dataSource.query(
      `
        SELECT ia.internship_assignment_id, ia.working_days,
               s.student_id,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               sai.strand_program, o.title AS job_title,
               ar.attendance_record_id, ar.time_in, ar.time_out,
               ar.attendance_status, ar.rendered_minutes
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.student s ON s.student_id = a.student_id
        LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
        LEFT JOIN public.attendance_record ar
          ON ar.internship_assignment_id = ia.internship_assignment_id
         AND ar.attendance_date = $2::date
        WHERE o.company_id = $1
          AND ia.deleted_at IS NULL
          AND ${HISTORICAL_ONGOING_ASSIGNMENT_PREDICATE}
          AND NOT EXISTS (
            SELECT 1 FROM public.internship_assignment_visibility iav
            WHERE iav.internship_assignment_id = ia.internship_assignment_id
              AND iav.employer_hidden_at IS NOT NULL
          )
          AND ($3::text IS NULL OR concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) ILIKE '%' || $3 || '%' OR o.title ILIKE '%' || $3 || '%')
        ORDER BY student_full_name ASC, ia.internship_assignment_id ASC
      `,
      [company.companyId, date, search],
    );

    return rows
      .filter((row) => isScheduledWorkday(date, row.working_days as number[]))
      .map((row) => {
        const recordRenderedMinutes = asNumber(row.rendered_minutes);
        const status: MonitoringAttendanceStatus =
          row.attendance_record_id === null
            ? 'pending'
            : (row.attendance_status as Exclude<
                MonitoringAttendanceStatus,
                'pending'
              >);
        return {
          internshipAssignmentId: asNumber(row.internship_assignment_id),
          studentId: asNumber(row.student_id),
          studentFullName: String(row.student_full_name),
          jobTitle: String(row.job_title),
          strandProgram:
            typeof row.strand_program === 'string' ? row.strand_program : null,
          date,
          status,
          timeIn: row.time_in as string | null,
          timeOut: row.time_out as string | null,
          renderedMinutes: recordRenderedMinutes,
          renderedHours: roundHours(recordRenderedMinutes / 60),
        };
      });
  }
}
