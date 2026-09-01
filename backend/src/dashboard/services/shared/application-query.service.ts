import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../../common/interfaces/paginated-response.interface';
import { getDateBoundaries } from '../../../common/helpers/date-filter.helper';
import { QueryApplicationsDto } from '../../dto/peso-dashboard.dto';

@Injectable()
export class ApplicationQueryService {
  constructor(private readonly dataSource: DataSource) {}

  async getApplications(
    queryDto: QueryApplicationsDto,
    paginationDto: PaginationDto,
    companyId?: number,
    excludeQcPesoHidden = false,
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

    if (companyId) {
      whereClauses.push(`ad.company_id = $${paramIndex++}`);
      params.push(companyId);
    }

    if (queryDto.status) {
      whereClauses.push(`ad.application_status = $${paramIndex++}`);
      params.push(queryDto.status);
    }

    const boundaries = getDateBoundaries(
      queryDto.datePreset,
      queryDto.startDate,
      queryDto.endDate,
    );

    if (boundaries) {
      whereClauses.push(`ad.submitted_at >= $${paramIndex++}`);
      params.push(boundaries.start.toISOString());
      whereClauses.push(`ad.submitted_at <= $${paramIndex++}`);
      params.push(boundaries.end.toISOString());
    }

    if (excludeQcPesoHidden) {
      whereClauses.push(`NOT EXISTS (
        SELECT 1 FROM public.application_visibility av
        WHERE av.application_id = ad.application_id
          AND av.qc_peso_hidden_at IS NOT NULL
      )`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*) AS count FROM public.vw_application_details ad ${whereSql}`;
    const countResult = await this.dataSource.query(countSql, params);
    const total = Number(countResult[0]?.count || 0);

    const dataSql = `
      SELECT 
        application_id AS "applicationId",
        student_id AS "studentId",
        student_full_name AS "studentFullName",
        student_contact_email AS "studentContactEmail",
        student_contact_number AS "studentContactNumber",
        school_name AS "schoolName",
        year_level AS "yearLevel",
        strand_program AS "strandProgram",
        opportunity_id AS "opportunityId",
        opportunity_title AS "opportunityTitle",
        opportunity_status AS "opportunityStatus",
        company_id AS "companyId",
        company_name AS "companyName",
        submitted_at AS "submittedAt",
        application_status AS "applicationStatus",
        application_remark AS "applicationRemark",
        student_response AS "studentResponse",
        student_responded_at AS "studentRespondedAt",
        referral_id AS "referralId",
        referral_status AS "referralStatus",
        company_response AS "companyResponse",
        internship_assignment_id AS "internshipAssignmentId",
        assignment_status AS "assignmentStatus"
      FROM public.vw_application_details ad
      ${whereSql}
      ORDER BY submitted_at DESC
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
}
