import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, QueryRunner } from 'typeorm';
import { withStatusActor } from '../../database/status-actor.transaction';
import type {
  CreateOpportunityDto,
  OpportunityListQueryDto,
  UpdateOpportunityDto,
} from '../dto';
import { EmployerCompanyResolver } from './company-resolver.service';
import { assertValidDate, currentManilaDate } from '../utils/time.utils';
import { asNumber, paginate } from '../utils/response.utils';

type OpportunityRow = Record<string, unknown>;

@Injectable()
export class EmployerOpportunityService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly companyResolver: EmployerCompanyResolver,
  ) {}

  async list(userAccountId: number, query: OpportunityListQueryDto) {
    const company = await this.companyResolver.resolve(userAccountId);
    const offset = (query.page - 1) * query.limit;
    const countRows: Array<{ total: string }> = await this.dataSource.query(
      `
        SELECT count(*)::text AS total
        FROM public.opportunity o
        WHERE o.company_id = $1
          AND ($2::text IS NULL OR o.opportunity_status::text = $2)
      `,
      [company.companyId, query.status ?? null],
    );
    const rows: OpportunityRow[] = await this.dataSource.query(
      `
        SELECT o.*,
          (o.application_deadline AT TIME ZONE 'Asia/Manila')::date::text AS deadline_date,
          count(r.referral_id)::text AS total_applicant_count
        FROM public.opportunity o
        LEFT JOIN public.application a ON a.opportunity_id = o.opportunity_id
        LEFT JOIN public.referral r ON r.application_id = a.application_id
        WHERE o.company_id = $1
          AND ($2::text IS NULL OR o.opportunity_status::text = $2)
        GROUP BY o.opportunity_id
        ORDER BY o.created_at DESC, o.opportunity_id DESC
        LIMIT $3 OFFSET $4
      `,
      [company.companyId, query.status ?? null, query.limit, offset],
    );
    const total = asNumber(countRows[0]?.total);
    return paginate(
      rows.map((row) => this.mapOpportunity(row)),
      query.page,
      query.limit,
      total,
    );
  }

  async create(
    userAccountId: number,
    dto: CreateOpportunityDto,
  ) {
    const company = await this.companyResolver.resolve(userAccountId);
    assertValidDate(dto.applicationDeadline, 'applicationDeadline');
    if (dto.applicationDeadline <= currentManilaDate()) {
      throw new ConflictException('applicationDeadline must be in the future.');
    }

    const allowance = this.normalizeAllowance(
      dto.allowance,
      dto.hasAllowance,
    );

    let createdId: number;
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const result = await runner.query(
        `
          INSERT INTO public.opportunity (
            company_id,
            title,
            department,
            work_arrangement,
            minimum_required_hours,
            offered_slots,
            allowance,
            description,
            qualification,
            application_deadline,
            opportunity_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
          RETURNING opportunity_id
        `,
        [
          company.companyId,
          dto.title.trim(),
          dto.department.trim(),
          dto.workArrangement,
          dto.minimumRequiredHours,
          dto.offeredSlots,
          allowance,
          dto.description.trim(),
          dto.qualification ? dto.qualification.trim() : null,
          dto.applicationDeadline,
        ],
      );
      createdId = asNumber(result[0]?.opportunity_id);
    });

    return this.getById(userAccountId, createdId!);
  }

  async getById(userAccountId: number, opportunityId: number) {
    const company = await this.companyResolver.resolve(userAccountId);
    const row = await this.findScoped(
      this.dataSource,
      company.companyId,
      opportunityId,
    );
    return this.mapOpportunity(row);
  }

  async update(
    userAccountId: number,
    opportunityId: number,
    dto: UpdateOpportunityDto,
  ) {
    const company = await this.companyResolver.resolve(userAccountId);
    const existing = await this.findScoped(this.dataSource, company.companyId, opportunityId);
    if (existing.opportunity_status === 'archived') {
      throw new ConflictException('Archived opportunities cannot be edited.');
    }
    if (dto.applicationDeadline) {
      assertValidDate(dto.applicationDeadline, 'applicationDeadline');
      if (dto.applicationDeadline <= currentManilaDate()) {
        throw new ConflictException('applicationDeadline must be in the future.');
      }
    }

    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const updates: string[] = [];
      const params: any[] = [opportunityId, company.companyId];
      let pIdx = 3;

      if (dto.title !== undefined) {
        updates.push(`title = $${pIdx++}`);
        params.push(dto.title.trim());
      }
      if (dto.department !== undefined) {
        updates.push(`department = $${pIdx++}`);
        params.push(dto.department.trim());
      }
      if (dto.workArrangement !== undefined) {
        updates.push(`work_arrangement = $${pIdx++}`);
        params.push(dto.workArrangement);
      }
      if (dto.minimumRequiredHours !== undefined) {
        updates.push(`minimum_required_hours = $${pIdx++}`);
        params.push(dto.minimumRequiredHours);
      }
      if (dto.offeredSlots !== undefined) {
        updates.push(`offered_slots = $${pIdx++}`);
        params.push(dto.offeredSlots);
      }
      if (dto.hasAllowance !== undefined || dto.allowance !== undefined) {
        updates.push(`allowance = $${pIdx++}`);
        params.push(
          dto.allowance !== undefined
            ? this.normalizeAllowance(dto.allowance, dto.hasAllowance)
            : this.normalizeAllowance(
                existing.allowance as string | number | null,
                dto.hasAllowance,
              ),
        );
      }
      if (dto.description !== undefined) {
        updates.push(`description = $${pIdx++}`);
        params.push(dto.description.trim());
      }
      if (dto.qualification !== undefined) {
        updates.push(`qualification = $${pIdx++}`);
        params.push(dto.qualification ? dto.qualification.trim() : null);
      }
      if (dto.applicationDeadline !== undefined) {
        updates.push(`application_deadline = $${pIdx++}`);
        params.push(dto.applicationDeadline);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        await runner.query(
          `
            UPDATE public.opportunity
            SET ${updates.join(', ')}
            WHERE opportunity_id = $1 AND company_id = $2
          `,
          params,
        );
      }
    });

    return this.getById(userAccountId, opportunityId);
  }

  async close(userAccountId: number, opportunityId: number) {
    const company = await this.companyResolver.resolve(userAccountId);
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const row = await this.findScoped(
        runner,
        company.companyId,
        opportunityId,
        true,
      );
      if (row.opportunity_status === 'archived') {
        throw new ConflictException('Archived opportunities cannot be closed.');
      }
      if (row.opportunity_status === 'open') {
        await runner.query(
          `UPDATE public.opportunity SET opportunity_status = 'closed' WHERE opportunity_id = $1`,
          [opportunityId],
        );
      }
    });
    return this.getById(userAccountId, opportunityId);
  }

  async archive(userAccountId: number, opportunityId: number) {
    const company = await this.companyResolver.resolve(userAccountId);
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const row = await this.findScoped(
        runner,
        company.companyId,
        opportunityId,
        true,
      );
      if (row.opportunity_status === 'archived') return;
      if (row.opportunity_status === 'open') {
        await runner.query(
          `UPDATE public.opportunity SET opportunity_status = 'closed' WHERE opportunity_id = $1`,
          [opportunityId],
        );
      }
      await runner.query(
        `UPDATE public.opportunity SET opportunity_status = 'archived' WHERE opportunity_id = $1`,
        [opportunityId],
      );
    });
    return this.getById(userAccountId, opportunityId);
  }

  private async findScoped(
    executor: Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>,
    companyId: number,
    opportunityId: number,
    forUpdate = false,
  ): Promise<OpportunityRow> {
    const rows: OpportunityRow[] = await executor.query(
      `
        SELECT o.*,
          (o.application_deadline AT TIME ZONE 'Asia/Manila')::date::text AS deadline_date,
          (SELECT count(*)::text
             FROM public.application a
             JOIN public.referral r ON r.application_id = a.application_id
            WHERE a.opportunity_id = o.opportunity_id) AS total_applicant_count
        FROM public.opportunity o
        WHERE o.opportunity_id = $1 AND o.company_id = $2
        ${forUpdate ? 'FOR UPDATE' : ''}
      `,
      [opportunityId, companyId],
    );
    if (!rows[0]) throw new NotFoundException('Opportunity not found');
    return rows[0];
  }

  private mapOpportunity(row: OpportunityRow) {
    return {
      opportunityId: asNumber(row.opportunity_id),
      title: row.title,
      department: row.department,
      description: row.description,
      qualification: row.qualification,
      minimumRequiredHours: asNumber(row.minimum_required_hours),
      workArrangement: row.work_arrangement,
      offeredSlots: asNumber(row.offered_slots),
      allowance:
        row.allowance !== null
          ? typeof row.allowance === 'string'
            ? row.allowance
            : typeof row.allowance === 'number'
              ? row.allowance.toString()
              : null
          : null,
      applicationDeadline: row.deadline_date,
      opportunityStatus: row.opportunity_status,
      totalApplicantCount: asNumber(row.total_applicant_count),
    };
  }

  private normalizeAllowance(
    value: string | number | null | undefined,
    hasAllowance?: boolean,
  ): string | null {
    const normalized =
      value === null || value === undefined ? '' : String(value).trim();
    if (hasAllowance === false) {
      if (normalized) {
        throw new ConflictException(
          'allowance must be empty when hasAllowance is false.',
        );
      }
      return null;
    }
    if (hasAllowance === true && !normalized) {
      throw new ConflictException(
        'allowance is required when hasAllowance is true.',
      );
    }
    return normalized || null;
  }
}
