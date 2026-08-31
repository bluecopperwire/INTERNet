import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { DateFilterDto } from '../../../common/dto/date-filter.dto';
import { getDateBoundaries } from '../../../common/helpers/date-filter.helper';
import { currentManilaDate } from '../../../employer/utils/time.utils';

@Injectable()
export class AttendanceQueryService {
  constructor(private readonly dataSource: DataSource) {}

  async getInternsSummary(
    dateFilterDto: DateFilterDto,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const page = Math.max(1, Number(paginationDto?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(paginationDto?.limit) || 20));
    const offset = (page - 1) * limit;

    const countSql = `
      SELECT COUNT(*) AS count 
      FROM public.vw_attendance_summary 
      WHERE assignment_status IN ('pending', 'ongoing')
    `;
    const countResult = await this.dataSource.query(countSql);
    const total = Number(countResult[0]?.count || 0);

    const dataSql = `
      SELECT 
        internship_assignment_id AS "internshipAssignmentId",
        student_id AS "studentId",
        student_full_name AS "studentFullName",
        opportunity_id AS "opportunityId",
        opportunity_title AS "opportunityTitle",
        company_id AS "companyId",
        company_name AS "companyName",
        assignment_status AS "assignmentStatus",
        required_hours AS "requiredHours",
        total_rendered_hours AS "totalRenderedHours",
        attendance_record_count AS "attendanceRecordCount",
        complete_count AS "completeCount",
        incomplete_count AS "incompleteCount",
        late_count AS "lateCount",
        undertime_count AS "undertimeCount",
        overtime_count AS "overtimeCount",
        first_attendance_date AS "firstAttendanceDate",
        latest_attendance_date AS "latestAttendanceDate",
        completion_percentage AS "completionPercentage"
      FROM public.vw_attendance_summary
      WHERE assignment_status IN ('pending', 'ongoing')
      ORDER BY internship_assignment_id DESC
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

  async getAllDtrEntries(
    dateFilterDto: DateFilterDto & { date?: string; status?: string; search?: string },
    paginationDto: PaginationDto,
    companyId?: number,
  ): Promise<PaginatedResponse<any>> {
    const page = Math.max(1, Number(paginationDto?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(paginationDto?.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['ia.deleted_at IS NULL'];
    const params: any[] = [];
    let paramIndex = 1;

    if (companyId) {
      whereClauses.push(`o.company_id = $${paramIndex++}`);
      params.push(companyId);
    }

    if (dateFilterDto.date) {
      whereClauses.push(`ar.attendance_date = $${paramIndex++}::date`);
      params.push(dateFilterDto.date);
    } else {
      const boundaries = getDateBoundaries(
        dateFilterDto.datePreset,
        dateFilterDto.startDate,
        dateFilterDto.endDate,
      );

      if (boundaries) {
        const startStr =
          dateFilterDto.startDate || currentManilaDate(boundaries.start);
        const endStr =
          dateFilterDto.endDate || currentManilaDate(boundaries.end);
        whereClauses.push(`ar.attendance_date >= $${paramIndex++}::date`);
        params.push(startStr);
        whereClauses.push(`ar.attendance_date <= $${paramIndex++}::date`);
        params.push(endStr);
      }
    }

    if (dateFilterDto.status && dateFilterDto.status !== 'All') {
      const s = dateFilterDto.status.toLowerCase().trim();
      if (s === 'present' || s === 'on_time') {
        whereClauses.push(`ar.time_in_status = 'on_time'`);
      } else if (s === 'late') {
        whereClauses.push(`ar.time_in_status = 'late'`);
      } else if (['complete', 'incomplete', 'undertime', 'overtime'].includes(s)) {
        whereClauses.push(`ar.rendered_hours_status = $${paramIndex++}`);
        params.push(s);
      }
    }

    if (dateFilterDto.search && dateFilterDto.search.trim()) {
      const term = `%${dateFilterDto.search.trim()}%`;
      whereClauses.push(
        `(concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex} OR o.title ILIKE $${paramIndex})`,
      );
      params.push(term);
      paramIndex++;
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT COUNT(*) AS count
      FROM public.attendance_record ar
      JOIN public.internship_assignment ia ON ia.internship_assignment_id = ar.internship_assignment_id
      JOIN public.referral r ON r.referral_id = ia.referral_id
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.student s ON s.student_id = a.student_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      JOIN public.company c ON c.company_id = o.company_id
      ${whereSql}
    `;

    const countResult = await this.dataSource.query(countSql, params);
    const total = Number(countResult[0]?.count || 0);

    const dataSql = `
      SELECT 
        ar.attendance_record_id AS "attendanceRecordId",
        ar.internship_assignment_id AS "internshipAssignmentId",
        concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS "studentFullName",
        concat_ws(' ', s.first_name, s.last_name) AS "studentName",
        o.title AS "role",
        o.department AS "department",
        c.company_name AS "company",
        ar.attendance_date::text AS "dtrDate",
        ar.attendance_date::text AS "date",
        ar.time_in AS "timeIn",
        ar.time_in_status AS "timeInStatus",
        ar.time_out AS "timeOut",
        ar.hours_rendered AS "totalHours",
        ar.rendered_hours_status AS "status",
        ar.photo_file_path AS "photoFilePath"
      FROM public.attendance_record ar
      JOIN public.internship_assignment ia ON ia.internship_assignment_id = ar.internship_assignment_id
      JOIN public.referral r ON r.referral_id = ia.referral_id
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.student s ON s.student_id = a.student_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      JOIN public.company c ON c.company_id = o.company_id
      ${whereSql}
      ORDER BY ar.attendance_date DESC, ar.time_in DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const dataParams = [...params, limit, offset];
    const data = await this.dataSource.query(dataSql, dataParams);
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

  async getAssignmentDtrDetail(
    assignmentId: number,
    dateFilterDto: DateFilterDto,
    scopedCompanyId?: number,
  ): Promise<any> {
    const summarySql = `
      SELECT 
        ia.internship_assignment_id AS "internshipAssignmentId",
        concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS "studentName",
        o.title AS "role",
        o.department AS "department",
        o.company_id AS "companyId",
        c.company_name AS "companyName",
        ia.start_date::text AS "startDate",
        ia.expected_end_date::text AS "expectedEndDate",
        ia.required_hours AS "targetHours",
        COALESCE(sum(ar.hours_rendered), 0::numeric) AS "totalRenderedTime"
      FROM public.internship_assignment ia
      JOIN public.referral r ON r.referral_id = ia.referral_id
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.student s ON s.student_id = a.student_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      JOIN public.company c ON c.company_id = o.company_id
      LEFT JOIN public.attendance_record ar ON ar.internship_assignment_id = ia.internship_assignment_id
      WHERE ia.internship_assignment_id = $1
        AND ia.deleted_at IS NULL
      GROUP BY ia.internship_assignment_id, s.first_name, s.middle_name, s.last_name, s.extension_name, o.title, o.department, o.company_id, c.company_name, ia.start_date, ia.expected_end_date, ia.required_hours
    `;

    const summaryRows = await this.dataSource.query(summarySql, [assignmentId]);
    if (!summaryRows || summaryRows.length === 0) {
      throw new NotFoundException('Internship assignment not found.');
    }

    const summary = summaryRows[0];

    if (scopedCompanyId && Number(summary.companyId) !== scopedCompanyId) {
      throw new ForbiddenException(
        'You do not have permission to view attendance for this assignment.',
      );
    }

    const targetHours = Number(summary.targetHours) || 0;
    const totalRendered = Number(summary.totalRenderedTime) || 0;
    const remainingHours = Math.max(0, targetHours - totalRendered);

    const whereClauses: string[] = ['ar.internship_assignment_id = $1'];
    const params: any[] = [assignmentId];
    let paramIndex = 2;

    const boundaries = getDateBoundaries(
      dateFilterDto.datePreset,
      dateFilterDto.startDate,
      dateFilterDto.endDate,
    );

    if (boundaries) {
      const startStr = currentManilaDate(boundaries.start);
      const endStr = currentManilaDate(boundaries.end);
      whereClauses.push(`ar.attendance_date >= $${paramIndex++}`);
      params.push(startStr);
      whereClauses.push(`ar.attendance_date <= $${paramIndex++}`);
      params.push(endStr);
    }

    const entriesSql = `
      SELECT 
        ar.attendance_record_id AS "attendanceRecordId",
        ar.attendance_date::text AS "date",
        ar.time_in AS "timeIn",
        ar.time_out AS "timeOut",
        ar.hours_rendered AS "totalHours",
        ar.time_in_status AS "timeInStatus",
        ar.rendered_hours_status AS "renderedHoursStatus"
      FROM public.attendance_record ar
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ar.attendance_date DESC, ar.time_in DESC
    `;

    const entriesRows = await this.dataSource.query(entriesSql, params);

    const entries = entriesRows.map((row: any) => ({
      attendanceRecordId: row.attendanceRecordId,
      date: row.date,
      timeIn: row.timeIn,
      timeOut: row.timeOut,
      totalHours: row.totalHours,
      timeInStatus: row.timeInStatus,
      renderedHoursStatus: row.renderedHoursStatus,
      // NOTE: attendance_record does not currently have a 'remark' column.
      // Once remark column is added, replace with: remarks: row.remark || null
      remarks: null,
    }));

    return {
      studentInfo: {
        studentName: summary.studentName,
        role: summary.role,
        department: summary.department,
        startDate: summary.startDate,
        expectedEndDate: summary.expectedEndDate,
        totalRenderedTime: totalRendered,
        targetHours,
        remainingHours,
      },
      dtrEntries: entries,
    };
  }
}
