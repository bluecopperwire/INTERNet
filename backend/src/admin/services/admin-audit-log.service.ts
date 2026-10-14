import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import type {
  AdminAuditLogQueryDto,
  AuditLogCategory,
} from '../dto/admin-audit-log.dto';
import { AUDIT_LOG_CATEGORIES } from '../dto/admin-audit-log.dto';

const DATABASE_CATEGORY: Record<AuditLogCategory, string> = {
  accounts: 'accounts',
  'applications-referrals': 'applications_referrals',
  internships: 'internships',
};

export const AUDIT_ACTION_LABELS = {
  account_created: 'Account Created',
  account_suspended: 'Account Suspended',
  account_unsuspended: 'Account Unsuspended',
  account_deactivated: 'Account Deactivated',
  application_submitted: 'Application Submitted',
  qc_peso_review_started: 'QC PESO Review Started',
  application_referred_to_employer: 'Application Referred to Employer',
  application_rejected_by_qc_peso: 'Application Rejected by QC PESO',
  employer_review_started: 'Employer Review Started',
  interview_scheduled: 'Interview Scheduled',
  offer_extended_by_employer: 'Offer Extended by Employer',
  referral_rejected_by_employer: 'Referral Rejected by Employer',
  offer_accepted_by_student: 'Offer Accepted by Student',
  offer_declined_by_student: 'Offer Declined by Student',
  application_withdrawn_by_student: 'Application Withdrawn by Student',
  application_or_referral_expired: 'Application or Referral Expired',
  internship_created: 'Internship Created',
  internship_started: 'Internship Started',
  internship_marked_complete_by_company:
    'Internship Marked Complete by Company',
  internship_completion_confirmed_by_student:
    'Internship Completion Confirmed by Student',
  internship_withdrawn_by_student: 'Internship Withdrawn by Student',
  internship_cancelled_by_company: 'Internship Cancelled by Company',
  internship_finalized_by_qc_peso: 'Internship Finalized by QC PESO',
} as const;

type AuditActionCode = keyof typeof AUDIT_ACTION_LABELS;

export const AUDIT_ACTIONS_BY_CATEGORY: Record<
  AuditLogCategory,
  readonly AuditActionCode[]
> = {
  accounts: [
    'account_created',
    'account_suspended',
    'account_deactivated',
    'account_unsuspended',
  ],
  'applications-referrals': [
    'application_submitted',
    'qc_peso_review_started',
    'application_referred_to_employer',
    'application_rejected_by_qc_peso',
    'employer_review_started',
    'interview_scheduled',
    'offer_extended_by_employer',
    'referral_rejected_by_employer',
    'offer_accepted_by_student',
    'offer_declined_by_student',
    'application_withdrawn_by_student',
    'application_or_referral_expired',
  ],
  internships: [
    'internship_created',
    'internship_started',
    'internship_marked_complete_by_company',
    'internship_completion_confirmed_by_student',
    'internship_withdrawn_by_student',
    'internship_cancelled_by_company',
    'internship_finalized_by_qc_peso',
  ],
};

type AuditRow = {
  auditEventId: string;
  actionCode: AuditActionCode;
  entityEmail: string;
  entityCode: string;
  previousStatus: string | null;
  newStatus: string;
  actorEmail: string;
  actorCode: string | null;
  occurredAt: Date | string;
};

@Injectable()
export class AdminAuditLogService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(categoryValue: string, query: AdminAuditLogQueryDto) {
    const category = this.parseCategory(categoryValue);
    const { whereSql, params } = this.filters(category, query);
    const countRows: Array<{ total: string | number }> =
      await this.dataSource.query(
        `SELECT count(*) AS total FROM public.audit_event ae ${whereSql}`,
        params,
      );
    const total = Number(countRows[0]?.total ?? 0);
    const pageParams = [...params, query.limit, (query.page - 1) * query.limit];
    const rows = await this.dataSource.query(
      `${this.selectSql()} ${whereSql}
       ORDER BY ae.occurred_at DESC, ae.audit_event_id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      pageParams,
    );
    return {
      data: (rows as AuditRow[]).map((row) => this.mapRow(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
      },
    };
  }

  async exportCsv(categoryValue: string, query: AdminAuditLogQueryDto) {
    const category = this.parseCategory(categoryValue);
    const { whereSql, params } = this.filters(category, query);
    const rows: AuditRow[] = await this.dataSource.query(
      `${this.selectSql()} ${whereSql}
       ORDER BY ae.occurred_at DESC, ae.audit_event_id DESC`,
      params,
    );
    const header = [
      'Date and Time',
      'Action',
      'Entity Email',
      'Entity Code',
      'Previous Status',
      'New Status',
      'Actor Email',
      'Actor Code',
    ];
    const lines = [header.map(csvCell).join(',')];
    for (const row of rows) {
      const item = this.mapRow(row);
      lines.push(
        [
          this.formatManilaDateTime(item.occurredAt),
          item.action,
          item.entityEmail,
          item.entityCode,
          item.previousStatus ?? '—',
          item.newStatus,
          item.actorEmail,
          item.actorCode ?? '—',
        ]
          .map(csvCell)
          .join(','),
      );
    }
    return `\uFEFF${lines.join('\r\n')}`;
  }

  private parseCategory(value: string): AuditLogCategory {
    if (!(AUDIT_LOG_CATEGORIES as readonly string[]).includes(value)) {
      throw new BadRequestException('Unsupported audit log category.');
    }
    return value as AuditLogCategory;
  }

  private filters(
    category: AuditLogCategory,
    query: AdminAuditLogQueryDto,
  ): { whereSql: string; params: unknown[] } {
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('dateFrom cannot be after dateTo.');
    }
    const clauses: string[] = [];
    const params: unknown[] = [];
    params.push(DATABASE_CATEGORY[category]);
    clauses.push(`ae.category = $${params.length}`);

    if (query.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      const index = params.length;
      clauses.push(`(
        lower(ae.entity_email) LIKE $${index}
        OR lower(ae.entity_code) LIKE $${index}
        OR lower(ae.actor_email) LIKE $${index}
        OR lower(COALESCE(ae.actor_code, '')) LIKE $${index}
      )`);
    }
    if (query.action) {
      if (
        !AUDIT_ACTIONS_BY_CATEGORY[category].includes(query.action as never)
      ) {
        throw new BadRequestException(
          'Action is not valid for this audit log category.',
        );
      }
      params.push(query.action);
      clauses.push(`ae.action_code = $${params.length}`);
    }
    if (query.dateFrom) {
      params.push(query.dateFrom);
      clauses.push(
        `ae.occurred_at >= ($${params.length}::date::timestamp AT TIME ZONE 'Asia/Manila')`,
      );
    }
    if (query.dateTo) {
      params.push(query.dateTo);
      clauses.push(
        `ae.occurred_at < (($${params.length}::date + 1)::timestamp AT TIME ZONE 'Asia/Manila')`,
      );
    }
    return { whereSql: `WHERE ${clauses.join(' AND ')}`, params };
  }

  private selectSql() {
    return `SELECT
      ae.audit_event_id::text AS "auditEventId",
      ae.action_code AS "actionCode",
      ae.entity_email AS "entityEmail",
      ae.entity_code AS "entityCode",
      ae.previous_status AS "previousStatus",
      ae.new_status AS "newStatus",
      ae.actor_email AS "actorEmail",
      ae.actor_code AS "actorCode",
      ae.occurred_at AS "occurredAt"
    FROM public.audit_event ae`;
  }

  private mapRow(row: AuditRow) {
    return {
      ...row,
      occurredAt: new Date(row.occurredAt).toISOString(),
      action: AUDIT_ACTION_LABELS[row.actionCode],
    };
  }

  private formatManilaDateTime(value: string) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(value));
  }
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
