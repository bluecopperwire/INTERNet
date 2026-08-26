import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OpportunityCatalogQueryDto } from './dto/opportunity-catalog.dto';

export interface OpportunityCatalogItem {
  opportunityId: number;
  companyId: number;
  companyName: string;
  companyType: string;
  industryId: number;
  industryName: string;
  companyLogoFilePath: string | null;
  companyAddressCity: string;
  title: string;
  department: string;
  description: string;
  qualification: string | null;
  minimumRequiredHours: number;
  workArrangement: string;
  offeredSlots: number;
  hasAllowance: boolean;
  allowance: number | null;
  applicationDeadline: string;
  opportunityStatus: string;
  createdAt: string;
  updatedAt: string;
  totalApplicationCount: number;
  activeApplicationCount: number;
  approvedForReferralCount: number;
  hasApplied: boolean;
}

@Injectable()
export class OpportunityCatalogService {
  constructor(private readonly dataSource: DataSource) {}

  async getOpportunities(
    query: OpportunityCatalogQueryDto,
    studentId?: number | null,
  ): Promise<{
    data: OpportunityCatalogItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [
      "o.opportunity_status = 'open'",
      "o.application_deadline >= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::date",
      'ua.account_status = \'active\'',
      'ua.deleted_at IS NULL',
    ];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.search) {
      whereClauses.push(
        `(o.title ILIKE $${paramIndex} OR o.description ILIKE $${paramIndex} OR o.company_name ILIKE $${paramIndex})`,
      );
      params.push(`%${query.search.trim()}%`);
      paramIndex++;
    }

    if (query.companyId) {
      whereClauses.push(`o.company_id = $${paramIndex}`);
      params.push(query.companyId);
      paramIndex++;
    }

    if (query.workArrangement) {
      whereClauses.push(`o.work_arrangement = $${paramIndex}`);
      params.push(query.workArrangement);
      paramIndex++;
    }

    if (query.hasAllowance !== undefined) {
      whereClauses.push(`o.has_allowance = $${paramIndex}`);
      params.push(query.hasAllowance);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countSql = `
      SELECT count(o.opportunity_id)::int as total
      FROM public.vw_opportunity_summary o
      JOIN public.company c ON c.company_id = o.company_id
      JOIN public.user_account ua ON ua.user_account_id = c.user_account_id
      ${whereSql}
    `;
    const countResult = await this.dataSource.query(countSql, params);
    const total = countResult[0]?.total ? parseInt(countResult[0].total, 10) : 0;
    const totalPages = Math.ceil(total / limit) || 1;

    let appliedSelect = 'false AS has_applied';
    const queryParams = [...params];
    if (studentId) {
      appliedSelect = `EXISTS (
        SELECT 1 FROM public.application app 
        WHERE app.opportunity_id = o.opportunity_id AND app.student_id = $${paramIndex}
      ) AS has_applied`;
      queryParams.push(studentId);
      paramIndex++;
    }

    const dataSql = `
      SELECT 
        o.opportunity_id,
        o.company_id,
        o.company_name,
        o.company_type,
        o.industry_id,
        o.industry_name,
        o.company_logo_file_path,
        o.company_address_city,
        o.title,
        o.department,
        o.description,
        o.qualification,
        o.minimum_required_hours,
        o.work_arrangement,
        o.offered_slots,
        o.has_allowance,
        o.allowance,
        o.application_deadline,
        o.opportunity_status,
        o.created_at,
        o.updated_at,
        o.total_application_count,
        o.active_application_count,
        o.approved_for_referral_count,
        ${appliedSelect}
      FROM public.vw_opportunity_summary o
      JOIN public.company c ON c.company_id = o.company_id
      JOIN public.user_account ua ON ua.user_account_id = c.user_account_id
      ${whereSql}
      ORDER BY o.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const rows = await this.dataSource.query(dataSql, queryParams);

    const data: OpportunityCatalogItem[] = rows.map((row: any) => ({
      opportunityId: Number(row.opportunity_id),
      companyId: Number(row.company_id),
      companyName: row.company_name,
      companyType: row.company_type,
      industryId: Number(row.industry_id),
      industryName: row.industry_name,
      companyLogoFilePath: row.company_logo_file_path,
      companyAddressCity: row.company_address_city,
      title: row.title,
      department: row.department,
      description: row.description,
      qualification: row.qualification,
      minimumRequiredHours: Number(row.minimum_required_hours),
      workArrangement: row.work_arrangement,
      offeredSlots: Number(row.offered_slots),
      hasAllowance: Boolean(row.has_allowance),
      allowance: row.allowance !== null ? Number(row.allowance) : null,
      applicationDeadline: row.application_deadline instanceof Date 
        ? row.application_deadline.toISOString().split('T')[0]
        : String(row.application_deadline),
      opportunityStatus: row.opportunity_status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      totalApplicationCount: Number(row.total_application_count),
      activeApplicationCount: Number(row.active_application_count),
      approvedForReferralCount: Number(row.approved_for_referral_count),
      hasApplied: Boolean(row.has_applied),
    }));

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

  async getOpportunityById(
    opportunityId: number,
    studentId?: number | null,
  ): Promise<OpportunityCatalogItem> {
    let appliedSelect = 'false AS has_applied';
    const params: any[] = [opportunityId];
    if (studentId) {
      appliedSelect = `EXISTS (
        SELECT 1 FROM public.application app 
        WHERE app.opportunity_id = o.opportunity_id AND app.student_id = $2
      ) AS has_applied`;
      params.push(studentId);
    }

    const sql = `
      SELECT 
        o.opportunity_id,
        o.company_id,
        o.company_name,
        o.company_type,
        o.industry_id,
        o.industry_name,
        o.company_logo_file_path,
        o.company_address_city,
        o.title,
        o.department,
        o.description,
        o.qualification,
        o.minimum_required_hours,
        o.work_arrangement,
        o.offered_slots,
        o.has_allowance,
        o.allowance,
        o.application_deadline,
        o.opportunity_status,
        o.created_at,
        o.updated_at,
        o.total_application_count,
        o.active_application_count,
        o.approved_for_referral_count,
        ${appliedSelect}
      FROM public.vw_opportunity_summary o
      JOIN public.company c ON c.company_id = o.company_id
      JOIN public.user_account ua ON ua.user_account_id = c.user_account_id
      WHERE o.opportunity_id = $1 AND ua.account_status = 'active' AND ua.deleted_at IS NULL
    `;
    const rows = await this.dataSource.query(sql, params);
    if (!rows || rows.length === 0) {
      throw new NotFoundException('Opportunity not found or unavailable');
    }

    const row = rows[0];
    return {
      opportunityId: Number(row.opportunity_id),
      companyId: Number(row.company_id),
      companyName: row.company_name,
      companyType: row.company_type,
      industryId: Number(row.industry_id),
      industryName: row.industry_name,
      companyLogoFilePath: row.company_logo_file_path,
      companyAddressCity: row.company_address_city,
      title: row.title,
      department: row.department,
      description: row.description,
      qualification: row.qualification,
      minimumRequiredHours: Number(row.minimum_required_hours),
      workArrangement: row.work_arrangement,
      offeredSlots: Number(row.offered_slots),
      hasAllowance: Boolean(row.has_allowance),
      allowance: row.allowance !== null ? Number(row.allowance) : null,
      applicationDeadline: row.application_deadline instanceof Date 
        ? row.application_deadline.toISOString().split('T')[0]
        : String(row.application_deadline),
      opportunityStatus: row.opportunity_status,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      totalApplicationCount: Number(row.total_application_count),
      activeApplicationCount: Number(row.active_application_count),
      approvedForReferralCount: Number(row.approved_for_referral_count),
      hasApplied: Boolean(row.has_applied),
    };
  }
}
