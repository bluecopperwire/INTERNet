import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type { AttendanceDateQueryDto, AttendanceListQueryDto } from '../dto';
import { EmployerCompanyResolver } from './company-resolver.service';
import {
  deriveRenderedHours,
  rawRenderedHours,
  remainingHours,
  roundHours,
} from '../utils/attendance.utils';
import { asNumber, paginate } from '../utils/response.utils';
import {
  assertValidDate,
  currentManilaDate,
  enumerateDates,
  hasShiftEnded,
  isScheduledWorkday,
  normalizeDateOnly,
} from '../utils/time.utils';

type AttendanceContextRow = Record<string, unknown>;

export interface DailyAttendanceRow {
  internshipAssignmentId: number;
  studentId: number;
  studentFullName: string;
  jobTitle: string;
  date: string;
  status: 'present' | 'late' | 'absent';
  timeIn: string | null;
  timeOut: string | null;
  renderedHours: number;
  renderedHoursStatus: 'incomplete' | 'undertime' | 'complete' | 'overtime';
}

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
    const present = rows.filter((row) => row.status === 'present').length;
    const late = rows.filter((row) => row.status === 'late').length;
    const absent = rows.filter((row) => row.status === 'absent').length;
    return {
      totalActive: present + late + absent,
      present,
      late,
      absent,
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

  async history(userAccountId: number, internshipAssignmentId: number) {
    const company = await this.companyResolver.resolve(userAccountId);
    const assignments: AttendanceContextRow[] = await this.dataSource.query(
      `
        SELECT ia.internship_assignment_id, ia.required_hours,
               ia.start_date::text AS start_date,
               ia.working_days, ia.start_shift, ia.end_shift,
               ia.assignment_status, s.student_id,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               o.title AS job_title,
               CASE
                 WHEN ia.assignment_status = 'completed' THEN ia.end_date::text
                 WHEN ia.assignment_status IN ('cancelled', 'withdrawn') THEN terminal_transition.terminal_date::text
                 ELSE NULL
               END AS actual_terminal_date
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.student s ON s.student_id = a.student_id
        LEFT JOIN LATERAL (
          SELECT (history.changed_at AT TIME ZONE 'Asia/Manila')::date AS terminal_date
          FROM public.internship_assignment_status_history history
          WHERE history.internship_assignment_id = ia.internship_assignment_id
            AND history.new_assignment_status = ia.assignment_status
            AND history.new_assignment_status IN ('cancelled', 'withdrawn')
          ORDER BY history.changed_at ASC,
                   history.internship_assignment_status_history_id ASC
          LIMIT 1
        ) terminal_transition ON true
        WHERE ia.internship_assignment_id = $1 AND o.company_id = $2
          AND ia.deleted_at IS NULL
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
               time_in, time_in_status, time_out
        FROM public.attendance_record
        WHERE internship_assignment_id = $1
        ORDER BY attendance_date ASC, attendance_record_id ASC
      `,
      [internshipAssignmentId],
    );

    const history = new Map<string, Record<string, unknown>>();
    let renderedHours = 0;
    for (const record of records) {
      const attendanceDate = normalizeDateOnly(
        record.attendance_date,
        'attendanceDate',
      );
      const timeIn = record.time_in as string;
      const timeOut = record.time_out as string | null;
      const derived = deriveRenderedHours(
        timeIn,
        timeOut,
        assignment.start_shift as string,
        assignment.end_shift as string,
      );
      renderedHours += rawRenderedHours(timeIn, timeOut);
      history.set(attendanceDate, {
        date: attendanceDate,
        timeIn: record.time_in,
        timeInStatus: record.time_in_status,
        timeOut: record.time_out,
        renderedHours: derived.renderedHours,
        renderedHoursStatus: derived.renderedHoursStatus,
      });
    }
    renderedHours = roundHours(renderedHours);

    const today = currentManilaDate();
    const startDate = normalizeDateOnly(assignment.start_date, 'startDate');
    const limit =
      assignment.actual_terminal_date === null
        ? today
        : normalizeDateOnly(
            assignment.actual_terminal_date,
            'actualTerminalDate',
          );
    const end = limit < today ? limit : today;
    if (startDate <= end) {
      for (const date of enumerateDates(startDate, end)) {
        if (history.has(date)) continue;
        if (!isScheduledWorkday(date, String(assignment.working_days)))
          continue;
        if (!hasShiftEnded(date, String(assignment.end_shift))) continue;
        history.set(date, {
          date,
          timeIn: null,
          timeInStatus: null,
          timeOut: null,
          renderedHours: 0,
          renderedHoursStatus: 'incomplete',
        });
      }
    }

    const requiredHours = asNumber(assignment.required_hours);
    return {
      header: {
        internshipAssignmentId,
        studentFullName: assignment.student_full_name,
        jobTitle: assignment.job_title,
        requiredHours,
        renderedHours,
        remainingHours: remainingHours(requiredHours, renderedHours),
      },
      history: [...history.values()].sort((a, b) =>
        String(b.date).localeCompare(String(a.date)),
      ),
    };
  }

  private async dailyRows(
    userAccountId: number,
    date: string,
    search: string | null,
  ): Promise<DailyAttendanceRow[]> {
    assertValidDate(date);
    const today = currentManilaDate();
    if (date > today) return [];
    const isToday = date === today;
    const company = await this.companyResolver.resolve(userAccountId);
    const rows: AttendanceContextRow[] = await this.dataSource.query(
      `
        SELECT ia.internship_assignment_id,
               ia.start_date::text AS start_date, ia.assignment_status,
               ia.working_days, ia.start_shift, ia.end_shift,
               s.student_id,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               o.title AS job_title,
               ar.attendance_record_id, ar.time_in, ar.time_in_status, ar.time_out,
               CASE
                 WHEN ia.assignment_status = 'completed' THEN ia.end_date::text
                 WHEN ia.assignment_status IN ('cancelled', 'withdrawn') THEN terminal_transition.terminal_date::text
                 ELSE NULL
               END AS actual_terminal_date
        FROM public.internship_assignment ia
        JOIN public.referral r ON r.referral_id = ia.referral_id
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.student s ON s.student_id = a.student_id
        LEFT JOIN LATERAL (
          SELECT (history.changed_at AT TIME ZONE 'Asia/Manila')::date AS terminal_date
          FROM public.internship_assignment_status_history history
          WHERE history.internship_assignment_id = ia.internship_assignment_id
            AND history.new_assignment_status = ia.assignment_status
            AND history.new_assignment_status IN ('cancelled', 'withdrawn')
          ORDER BY history.changed_at ASC,
                   history.internship_assignment_status_history_id ASC
          LIMIT 1
        ) terminal_transition ON true
        LEFT JOIN public.attendance_record ar
          ON ar.internship_assignment_id = ia.internship_assignment_id
         AND ar.attendance_date = $2::date
        WHERE o.company_id = $1
          AND ia.deleted_at IS NULL
          AND ia.start_date <= $2::date
          AND ($4::boolean = false OR ia.assignment_status = 'ongoing')
          AND ($3::text IS NULL OR concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) ILIKE '%' || $3 || '%' OR o.title ILIKE '%' || $3 || '%')
        ORDER BY student_full_name ASC, ia.internship_assignment_id ASC
      `,
      [company.companyId, date, search, isToday],
    );

    const result: DailyAttendanceRow[] = [];
    for (const row of rows) {
      if (!this.isApplicableOnDate(row, date, isToday)) continue;
      if (!isScheduledWorkday(date, String(row.working_days))) continue;
      if (row.attendance_record_id === null) {
        if (!hasShiftEnded(date, String(row.end_shift))) continue;
        result.push({
          internshipAssignmentId: asNumber(row.internship_assignment_id),
          studentId: asNumber(row.student_id),
          studentFullName: String(row.student_full_name),
          jobTitle: String(row.job_title),
          date,
          status: 'absent',
          timeIn: null,
          timeOut: null,
          renderedHours: 0,
          renderedHoursStatus: 'incomplete',
        });
        continue;
      }
      const derived = deriveRenderedHours(
        row.time_in as string,
        row.time_out as string | null,
        row.start_shift as string,
        row.end_shift as string,
      );
      result.push({
        internshipAssignmentId: asNumber(row.internship_assignment_id),
        studentId: asNumber(row.student_id),
        studentFullName: String(row.student_full_name),
        jobTitle: String(row.job_title),
        date,
        status: row.time_in_status === 'late' ? 'late' : 'present',
        timeIn: row.time_in as string,
        timeOut: row.time_out as string | null,
        renderedHours: derived.renderedHours,
        renderedHoursStatus: derived.renderedHoursStatus,
      });
    }
    return result;
  }

  private isApplicableOnDate(
    row: AttendanceContextRow,
    date: string,
    isToday: boolean,
  ): boolean {
    if (normalizeDateOnly(row.start_date, 'startDate') > date) return false;
    if (isToday) return row.assignment_status === 'ongoing';
    const terminalDate =
      row.actual_terminal_date === null
        ? null
        : normalizeDateOnly(row.actual_terminal_date, 'actualTerminalDate');
    return terminalDate === null || terminalDate >= date;
  }
}
