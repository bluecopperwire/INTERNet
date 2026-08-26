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
import { dbMigrationPending } from '../utils/errors.utils';
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
  ): Promise<never> {
    await this.companyResolver.resolve(userAccountId);
    assertValidDate(dto.applicationDeadline, 'applicationDeadline');
    if (dto.applicationDeadline < currentManilaDate()) {
      throw new ConflictException('applicationDeadline cannot be in the past.');
    }
    // TODO(DB-EMP-001): Implement after the text allowance model is approved and migrated.
    throw dbMigrationPending(
      'DB-EMP-001',
      'Opportunity creation is temporarily unavailable pending the approved allowance migration.',
    );
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
  ): Promise<never> {
    const company = await this.companyResolver.resolve(userAccountId);
    await this.findScoped(this.dataSource, company.companyId, opportunityId);
    if (dto.applicationDeadline) {
      assertValidDate(dto.applicationDeadline, 'applicationDeadline');
    }
    // TODO(DB-EMP-001): Implement after the text allowance model is approved and migrated.
    throw dbMigrationPending(
      'DB-EMP-001',
      'Opportunity updates are temporarily unavailable pending the approved allowance migration.',
    );
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
        row.has_allowance === true && row.allowance !== null
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
}
