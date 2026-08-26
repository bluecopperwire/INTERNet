import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { access } from 'node:fs/promises';
import { basename, extname, isAbsolute, relative, resolve } from 'node:path';
import type { DataSource, QueryRunner } from 'typeorm';
import { withStatusActor } from '../../database/status-actor.transaction';
import type {
  ReferralListQueryDto,
  RejectReferralDto,
  ScheduleInterviewDto,
} from '../dto';
import { InterviewMode } from '../dto';
import { EmployerCompanyResolver } from './company-resolver.service';
import { asNumber, paginate } from '../utils/response.utils';
import { dbMigrationPending } from '../utils/errors.utils';
import { manilaDateTimeToIso } from '../utils/time.utils';

type ReferralRow = Record<string, unknown>;

export interface EmployerDocumentDownload {
  absolutePath: string;
  downloadName: string;
  mimeType: string;
}

@Injectable()
export class EmployerReferralService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly companyResolver: EmployerCompanyResolver,
  ) {}

  async list(userAccountId: number, query: ReferralListQueryDto) {
    const company = await this.companyResolver.resolve(userAccountId);
    return this.listScoped(company.companyId, query);
  }

  async listForOpportunity(
    userAccountId: number,
    opportunityId: number,
    query: ReferralListQueryDto,
  ) {
    const company = await this.companyResolver.resolve(userAccountId);
    const opportunities: Array<{ opportunity_id: number }> =
      await this.dataSource.query(
        `SELECT opportunity_id FROM public.opportunity WHERE opportunity_id = $1 AND company_id = $2`,
        [opportunityId, company.companyId],
      );
    if (!opportunities[0]) throw new NotFoundException('Opportunity not found');
    return this.listScoped(company.companyId, query, opportunityId);
  }

  async getById(userAccountId: number, referralId: number) {
    const company = await this.companyResolver.resolve(userAccountId);
    const row = await this.findScoped(
      this.dataSource,
      company.companyId,
      referralId,
    );
    const documents: ReferralRow[] = await this.dataSource.query(
      `
        SELECT srs.student_requirement_submission_id,
               srs.requirement_type_id,
               rt.requirement_type_name,
               srs.requirement_name
        FROM public.student_requirement_submission srs
        JOIN public.requirement_type rt
          ON rt.requirement_type_id = srs.requirement_type_id
        WHERE srs.student_id = $1
        ORDER BY rt.requirement_type_name, srs.student_requirement_submission_id
      `,
      [row.student_id],
    );
    return this.mapDetail(row, documents);
  }

  async accept(userAccountId: number, referralId: number) {
    const company = await this.companyResolver.resolve(userAccountId);
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const row = await this.findScoped(
        runner,
        company.companyId,
        referralId,
        true,
      );
      if (
        !['pending', 'for_interview'].includes(String(row.company_response))
      ) {
        throw new ConflictException(
          'Only pending or for_interview referrals can be accepted.',
        );
      }
      if (row.referral_status === 'sent') {
        await runner.query(
          `UPDATE public.referral SET referral_status = 'under_review' WHERE referral_id = $1`,
          [referralId],
        );
      } else if (row.referral_status !== 'under_review') {
        throw new ConflictException('Referral is not in an actionable state.');
      }
      await runner.query(
        `
          UPDATE public.referral
          SET company_response = 'accepted', company_responded_at = CURRENT_TIMESTAMP
          WHERE referral_id = $1
        `,
        [referralId],
      );
    });
    return this.getById(userAccountId, referralId);
  }

  async scheduleInterview(
    userAccountId: number,
    referralId: number,
    dto: ScheduleInterviewDto,
  ) {
    if (dto.interviewMode === InterviewMode.ONLINE) {
      if (!dto.onlineMeetingUrl || dto.physicalLocation) {
        throw new BadRequestException(
          'Online interviews require onlineMeetingUrl and no physicalLocation.',
        );
      }
    } else if (!dto.physicalLocation || dto.onlineMeetingUrl) {
      throw new BadRequestException(
        'Physical interviews require physicalLocation and no onlineMeetingUrl.',
      );
    }
    const scheduledAt = manilaDateTimeToIso(
      dto.interviewDate,
      dto.interviewTime,
    );
    if (new Date(scheduledAt).getTime() <= Date.now()) {
      throw new BadRequestException(
        'Interview schedule must be in the future.',
      );
    }

    const company = await this.companyResolver.resolve(userAccountId);
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const row = await this.findScoped(
        runner,
        company.companyId,
        referralId,
        true,
      );
      if (['accepted', 'rejected'].includes(String(row.company_response))) {
        throw new ConflictException(
          'A final employer response cannot be scheduled or rescheduled.',
        );
      }
      if (!['sent', 'under_review'].includes(String(row.referral_status))) {
        throw new ConflictException('Referral is not in an actionable state.');
      }
      if (row.referral_status === 'sent') {
        await runner.query(
          `UPDATE public.referral SET referral_status = 'under_review' WHERE referral_id = $1`,
          [referralId],
        );
      }
      await runner.query(
        `
          UPDATE public.referral
          SET company_response = 'for_interview', company_responded_at = CURRENT_TIMESTAMP
          WHERE referral_id = $1
        `,
        [referralId],
      );
      await runner.query(
        `
          INSERT INTO public.interview (
            referral_id, scheduled_at, interview_mode,
            physical_location, online_meeting_url, remark
          ) VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (referral_id) DO UPDATE SET
            scheduled_at = EXCLUDED.scheduled_at,
            interview_mode = EXCLUDED.interview_mode,
            physical_location = EXCLUDED.physical_location,
            online_meeting_url = EXCLUDED.online_meeting_url,
            remark = EXCLUDED.remark
        `,
        [
          referralId,
          scheduledAt,
          dto.interviewMode,
          dto.interviewMode === InterviewMode.PHYSICAL
            ? dto.physicalLocation
            : null,
          dto.interviewMode === InterviewMode.ONLINE
            ? dto.onlineMeetingUrl
            : null,
          dto.remark ?? null,
        ],
      );
    });
    return this.getById(userAccountId, referralId);
  }

  async reject(
    userAccountId: number,
    referralId: number,
    dto: RejectReferralDto,
  ) {
    const company = await this.companyResolver.resolve(userAccountId);
    await withStatusActor(this.dataSource, userAccountId, async (runner) => {
      const row = await this.findScoped(
        runner,
        company.companyId,
        referralId,
        true,
      );
      if (
        !['pending', 'for_interview'].includes(String(row.company_response))
      ) {
        throw new ConflictException(
          'Only pending or for_interview referrals can be rejected.',
        );
      }
      if (row.referral_status === 'sent') {
        await runner.query(
          `UPDATE public.referral SET referral_status = 'under_review' WHERE referral_id = $1`,
          [referralId],
        );
      } else if (row.referral_status !== 'under_review') {
        throw new ConflictException('Referral is not in an actionable state.');
      }
      await runner.query(
        `
          UPDATE public.referral
          SET referral_status = 'closed',
              company_response = 'rejected',
              company_responded_at = CURRENT_TIMESTAMP,
              remark = $2
          WHERE referral_id = $1
        `,
        [referralId, dto.remark ?? null],
      );
    });
    return this.getById(userAccountId, referralId);
  }

  async withdrawAcceptance(
    userAccountId: number,
    referralId: number,
  ): Promise<never> {
    const company = await this.companyResolver.resolve(userAccountId);
    const row = await this.findScoped(
      this.dataSource,
      company.companyId,
      referralId,
    );
    if (row.company_response !== 'accepted') {
      throw new ConflictException(
        'Only an accepted referral can be withdrawn.',
      );
    }
    // TODO(DB-EMP-002): Implement after the accepted -> rejected workflow is migrated.
    throw dbMigrationPending(
      'DB-EMP-002',
      'Acceptance withdrawal is temporarily unavailable pending an approved database migration.',
    );
  }

  async getDocumentDownload(
    userAccountId: number,
    referralId: number,
    documentId: number,
  ): Promise<EmployerDocumentDownload> {
    const company = await this.companyResolver.resolve(userAccountId);
    const rows: ReferralRow[] = await this.dataSource.query(
      `
        SELECT srs.requirement_file_path, srs.requirement_name,
               rt.requirement_type_name
        FROM public.referral r
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.student_requirement_submission srs
          ON srs.student_id = a.student_id
        JOIN public.requirement_type rt
          ON rt.requirement_type_id = srs.requirement_type_id
        WHERE r.referral_id = $1
          AND o.company_id = $2
          AND srs.student_requirement_submission_id = $3
      `,
      [referralId, company.companyId, documentId],
    );
    const row = rows[0];
    if (!row) throw new NotFoundException('Document not found');

    const storedPath = String(row.requirement_file_path);
    const prefix = '/uploads/requirements/';
    if (!storedPath.startsWith(prefix)) {
      throw new NotFoundException('Document file not found');
    }
    const filename = storedPath.slice(prefix.length);
    if (!filename || basename(filename) !== filename) {
      throw new NotFoundException('Document file not found');
    }
    const root = resolve(process.cwd(), 'uploads', 'requirements');
    const absolutePath = resolve(root, filename);
    const pathFromRoot = relative(root, absolutePath);
    if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
      throw new NotFoundException('Document file not found');
    }
    try {
      await access(absolutePath);
    } catch {
      throw new NotFoundException('Document file not found');
    }

    const extension = extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const baseName = String(row.requirement_name ?? row.requirement_type_name)
      .replace(/[\\/\r\n"]/g, '_')
      .slice(0, 120);
    return {
      absolutePath,
      downloadName: baseName.endsWith(extension)
        ? baseName
        : `${baseName}${extension}`,
      mimeType: mimeTypes[extension] ?? 'application/octet-stream',
    };
  }

  private async listScoped(
    companyId: number,
    query: ReferralListQueryDto,
    opportunityId?: number,
  ) {
    const search = query.search?.trim() || null;
    const params = [
      companyId,
      query.companyResponse ?? null,
      search,
      opportunityId ?? null,
    ];
    const countRows: Array<{ total: string }> = await this.dataSource.query(
      `
        SELECT count(*)::text AS total
        FROM public.referral r
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.student s ON s.student_id = a.student_id
        WHERE o.company_id = $1
          AND ($2::text IS NULL OR r.company_response::text = $2)
          AND ($3::text IS NULL OR concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) ILIKE '%' || $3 || '%' OR o.title ILIKE '%' || $3 || '%')
          AND ($4::integer IS NULL OR o.opportunity_id = $4)
      `,
      params,
    );
    const offset = (query.page - 1) * query.limit;
    const rows: ReferralRow[] = await this.dataSource.query(
      `
        SELECT r.referral_id, r.company_response, r.referred_at,
               a.application_id, a.submitted_at,
               s.student_id,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               sai.strand_program, sai.year_level,
               o.opportunity_id, o.title AS opportunity_title
        FROM public.referral r
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.student s ON s.student_id = a.student_id
        LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
        WHERE o.company_id = $1
          AND ($2::text IS NULL OR r.company_response::text = $2)
          AND ($3::text IS NULL OR concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) ILIKE '%' || $3 || '%' OR o.title ILIKE '%' || $3 || '%')
          AND ($4::integer IS NULL OR o.opportunity_id = $4)
        ORDER BY r.referred_at DESC, r.referral_id DESC
        LIMIT $5 OFFSET $6
      `,
      [...params, query.limit, offset],
    );
    return paginate(
      rows.map((row) => ({
        referralId: asNumber(row.referral_id),
        applicationId: asNumber(row.application_id),
        studentId: asNumber(row.student_id),
        studentFullName: row.student_full_name,
        opportunityId: asNumber(row.opportunity_id),
        opportunityTitle: row.opportunity_title,
        strandProgram: row.strand_program,
        yearLevel: row.year_level,
        submittedAt: row.submitted_at,
        companyResponse: row.company_response,
      })),
      query.page,
      query.limit,
      asNumber(countRows[0]?.total),
    );
  }

  private async findScoped(
    executor: Pick<DataSource, 'query'> | Pick<QueryRunner, 'query'>,
    companyId: number,
    referralId: number,
    forUpdate = false,
  ): Promise<ReferralRow> {
    const rows: ReferralRow[] = await executor.query(
      `
        SELECT r.referral_id, r.referral_status, r.company_response,
               r.company_responded_at, r.remark AS referral_remark,
               a.application_id, a.submitted_at, a.student_response,
               s.student_id,
               concat_ws(' ', s.first_name, s.middle_name, s.last_name, s.extension_name) AS student_full_name,
               s.contact_email, s.contact_number, s.address_line,
               s.address_barangay, s.address_district, s.address_city,
               sai.school_name, sai.year_level, sai.strand_program,
               ip.required_hours AS preference_required_hours,
               ip.available_days, ip.start_date AS preference_start_date,
               o.opportunity_id, o.title AS opportunity_title,
               iv.interview_id, iv.scheduled_at, iv.interview_mode,
               iv.physical_location, iv.online_meeting_url,
               iv.remark AS interview_remark
        FROM public.referral r
        JOIN public.application a ON a.application_id = r.application_id
        JOIN public.opportunity o ON o.opportunity_id = a.opportunity_id
        JOIN public.student s ON s.student_id = a.student_id
        LEFT JOIN public.student_academic_information sai ON sai.student_id = s.student_id
        LEFT JOIN public.internship_preference ip ON ip.student_id = s.student_id
        LEFT JOIN public.interview iv ON iv.referral_id = r.referral_id
        WHERE r.referral_id = $1 AND o.company_id = $2
        ${forUpdate ? 'FOR UPDATE OF r' : ''}
      `,
      [referralId, companyId],
    );
    if (!rows[0]) throw new NotFoundException('Referral not found');
    return rows[0];
  }

  private mapDetail(row: ReferralRow, documents: ReferralRow[]) {
    return {
      referral: {
        referralId: asNumber(row.referral_id),
        referralStatus: row.referral_status,
        companyResponse: row.company_response,
        companyRespondedAt: row.company_responded_at,
        referralRemark: row.referral_remark,
      },
      application: {
        applicationId: asNumber(row.application_id),
        submittedAt: row.submitted_at,
        studentResponse: row.student_response,
      },
      student: {
        studentId: asNumber(row.student_id),
        fullName: row.student_full_name,
        contactEmail: row.contact_email,
        contactNumber: row.contact_number,
        addressLine: row.address_line,
        addressBarangay: row.address_barangay,
        addressDistrict: row.address_district,
        addressCity: row.address_city,
        schoolName: row.school_name,
        yearLevel: row.year_level,
        strandProgram: row.strand_program,
      },
      internshipPreference: {
        requiredHours:
          row.preference_required_hours === null
            ? null
            : asNumber(row.preference_required_hours),
        availableDays: row.available_days,
        startDate: row.preference_start_date,
      },
      opportunity: {
        opportunityId: asNumber(row.opportunity_id),
        title: row.opportunity_title,
      },
      interview:
        row.interview_id === null
          ? null
          : {
              interviewId: asNumber(row.interview_id),
              scheduledAt: row.scheduled_at,
              interviewMode: row.interview_mode,
              physicalLocation: row.physical_location,
              onlineMeetingUrl: row.online_meeting_url,
              remark: row.interview_remark,
            },
      documents: documents.map((document) => ({
        submissionId: asNumber(document.student_requirement_submission_id),
        requirementTypeId: asNumber(document.requirement_type_id),
        requirementTypeName: document.requirement_type_name,
        requirementName: document.requirement_name,
      })),
    };
  }
}
