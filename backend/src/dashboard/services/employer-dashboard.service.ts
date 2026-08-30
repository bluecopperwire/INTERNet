import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  EmployerDashboardMetricsDto,
  EmployerDtrDashboardMetricsDto,
  EmployerReportsMetricsDto,
  EmployerReportsQueryDto,
} from '../dto/employer-dashboard.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { DateFilterDto } from '../../common/dto/date-filter.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { ApplicationQueryService } from './shared/application-query.service';
import { AttendanceQueryService } from './shared/attendance-query.service';
import { getDateBoundaries } from '../../common/helpers/date-filter.helper';

@Injectable()
export class EmployerDashboardService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly applicationQuery: ApplicationQueryService,
    private readonly attendanceQuery: AttendanceQueryService,
  ) {}

  // E1. Employer dashboard metrics
  async getDashboardMetrics(
    companyId: number,
  ): Promise<EmployerDashboardMetricsDto> {
    const activeOppSql = `
      SELECT COUNT(*) AS count 
      FROM public.opportunity 
      WHERE company_id = $1 AND opportunity_status = 'open'
    `;
    const activeOppRes = await this.dataSource.query(activeOppSql, [companyId]);
    const activeOpportunities = Number(activeOppRes[0]?.count || 0);

    const pendingReviewSql = `
      SELECT COUNT(*) AS count
      FROM public.application a
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      WHERE o.company_id = $1 AND a.application_status IN ('submitted', 'under_review')
    `;
    const pendingReviewRes = await this.dataSource.query(pendingReviewSql, [
      companyId,
    ]);
    const pendingReviews = Number(pendingReviewRes[0]?.count || 0);

    const totalAppSql = `
      SELECT COUNT(*) AS count
      FROM public.application a
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      WHERE o.company_id = $1
    `;
    const totalAppRes = await this.dataSource.query(totalAppSql, [companyId]);
    const totalApplicants = Number(totalAppRes[0]?.count || 0);

    const acceptedSql = `
      SELECT COUNT(*) AS count
      FROM public.referral r
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      WHERE o.company_id = $1 AND r.company_response = 'accepted'
    `;
    const acceptedRes = await this.dataSource.query(acceptedSql, [companyId]);
    const acceptedCount = Number(acceptedRes[0]?.count || 0);

    const rejectedSql = `
      SELECT COUNT(*) AS count
      FROM public.referral r
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      WHERE o.company_id = $1 AND r.company_response = 'rejected'
    `;
    const rejectedRes = await this.dataSource.query(rejectedSql, [companyId]);
    const rejectedCount = Number(rejectedRes[0]?.count || 0);

    return {
      activeOpportunities,
      pendingReviews,
      totalApplicants,
      acceptedCount,
      rejectedCount,
    };
  }

  // E2. Employer application list
  async getEmployerApplications(
    companyId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    return this.applicationQuery.getApplications(
      {},
      paginationDto,
      companyId,
    );
  }

  // E3. Employer reports dashboard
  async getEmployerReports(
    companyId: number,
    queryDto: EmployerReportsQueryDto,
  ): Promise<EmployerReportsMetricsDto> {
    const whereClauses: string[] = ['o.company_id = $1'];
    const params: any[] = [companyId];
    let paramIndex = 2;

    const boundaries = getDateBoundaries(
      undefined,
      queryDto.startDate,
      queryDto.endDate,
    );

    if (boundaries) {
      whereClauses.push(`a.submitted_at >= $${paramIndex++}`);
      params.push(boundaries.start.toISOString());
      whereClauses.push(`a.submitted_at <= $${paramIndex++}`);
      params.push(boundaries.end.toISOString());
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const totalAppSql = `
      SELECT COUNT(*) AS count
      FROM public.application a
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      ${whereSql}
    `;
    const totalAppRes = await this.dataSource.query(totalAppSql, params);
    const totalApplicants = Number(totalAppRes[0]?.count || 0);

    const acceptedSql = `
      SELECT COUNT(*) AS count
      FROM public.referral r
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      ${whereSql} AND r.company_response = 'accepted'
    `;
    const acceptedRes = await this.dataSource.query(acceptedSql, params);
    const accepted = Number(acceptedRes[0]?.count || 0);

    const shortlistedSql = `
      SELECT COUNT(*) AS count
      FROM public.referral r
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      ${whereSql} AND r.company_response = 'for_interview'
    `;
    const shortlistedRes = await this.dataSource.query(shortlistedSql, params);
    const shortlisted = Number(shortlistedRes[0]?.count || 0);

    const rejectedSql = `
      SELECT COUNT(*) AS count
      FROM public.referral r
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      ${whereSql} AND r.company_response = 'rejected'
    `;
    const rejectedRes = await this.dataSource.query(rejectedSql, params);
    const rejected = Number(rejectedRes[0]?.count || 0);

    return {
      totalApplicants,
      accepted,
      shortlisted,
      rejected,
    };
  }

  // F1. Employer DTR dashboard metrics
  async getDtrDashboardMetrics(
    companyId: number,
    dateFilterDto: DateFilterDto,
  ): Promise<EmployerDtrDashboardMetricsDto> {
    // 1. Total active interns for this company
    const activeInternsSql = `
      SELECT COUNT(*) AS count
      FROM public.internship_assignment ia
      JOIN public.referral r ON r.referral_id = ia.referral_id
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      WHERE o.company_id = $1 AND ia.assignment_status IN ('pending', 'ongoing')
        AND ia.deleted_at IS NULL
    `;
    const activeInternsRes = await this.dataSource.query(activeInternsSql, [
      companyId,
    ]);
    const totalActiveInterns = Number(activeInternsRes[0]?.count || 0);

    // 2. Total present TODAY (or in date range)
    const boundaries = getDateBoundaries(
      dateFilterDto.datePreset,
      dateFilterDto.startDate,
      dateFilterDto.endDate,
    );

    let dateCond = 'ar.attendance_date = CURRENT_DATE';
    const dateParams: any[] = [companyId];

    if (boundaries) {
      dateCond =
        'ar.attendance_date >= $2::date AND ar.attendance_date <= $3::date';
      dateParams.push(
        boundaries.start.toISOString().split('T')[0],
        boundaries.end.toISOString().split('T')[0],
      );
    }

    const presentSql = `
      SELECT COUNT(DISTINCT ar.internship_assignment_id) AS count
      FROM public.attendance_record ar
      JOIN public.internship_assignment ia ON ia.internship_assignment_id = ar.internship_assignment_id
      JOIN public.referral r ON r.referral_id = ia.referral_id
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      WHERE o.company_id = $1 AND ${dateCond}
        AND ia.deleted_at IS NULL
    `;
    const presentRes = await this.dataSource.query(presentSql, dateParams);
    const totalPresent = Number(presentRes[0]?.count || 0);

    // 3. Absent is ALWAYS today's count per user requirement: totalActiveInterns - todayPresent
    const todayPresentSql = `
      SELECT COUNT(DISTINCT ar.internship_assignment_id) AS count
      FROM public.attendance_record ar
      JOIN public.internship_assignment ia ON ia.internship_assignment_id = ar.internship_assignment_id
      JOIN public.referral r ON r.referral_id = ia.referral_id
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      WHERE o.company_id = $1 AND ar.attendance_date = CURRENT_DATE
        AND ia.deleted_at IS NULL
    `;
    const todayPresentRes = await this.dataSource.query(todayPresentSql, [
      companyId,
    ]);
    const todayPresentCount = Number(todayPresentRes[0]?.count || 0);
    const totalAbsent = Math.max(0, totalActiveInterns - todayPresentCount);

    // 4. Total late in the filtered period
    const lateSql = `
      SELECT COUNT(*) AS count
      FROM public.attendance_record ar
      JOIN public.internship_assignment ia ON ia.internship_assignment_id = ar.internship_assignment_id
      JOIN public.referral r ON r.referral_id = ia.referral_id
      JOIN public.application a ON a.application_id = r.application_id
      JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
      WHERE o.company_id = $1 AND ar.time_in_status = 'late' AND ${dateCond}
        AND ia.deleted_at IS NULL
    `;
    const lateRes = await this.dataSource.query(lateSql, dateParams);
    const totalLate = Number(lateRes[0]?.count || 0);

    return {
      totalActiveInterns,
      totalPresent,
      totalAbsent,
      totalLate,
    };
  }

  // F2 & F3. Employer student attendance summary
  async getStudentAttendanceSummary(
    companyId: number,
    assignmentId: number,
    dateFilterDto: DateFilterDto,
  ): Promise<any> {
    return this.attendanceQuery.getAssignmentDtrDetail(
      assignmentId,
      dateFilterDto,
      companyId,
    );
  }
}
