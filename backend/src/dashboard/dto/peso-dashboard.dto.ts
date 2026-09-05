import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { DateFilterDto } from '../../common/dto/date-filter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum ApplicationStatusFilter {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED_FOR_REFERRAL = 'approved_for_referral',
  REJECTED_FOR_REFERRAL = 'rejected_for_referral',
  CLOSED = 'closed',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired',
}

export enum ApplicationListView {
  REVIEW = 'review',
  HISTORY = 'history',
}

export enum ReferralResponseFilter {
  PENDING = 'pending',
  FOR_INTERVIEW = 'for_interview',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export class QueryApplicationsDto extends DateFilterDto {
  @IsOptional()
  @IsEnum(ApplicationListView)
  view?: ApplicationListView = ApplicationListView.HISTORY;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ApplicationStatusFilter)
  status?: ApplicationStatusFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsIn([5, 10, 15])
  limit?: number = 10;
}

export class QueryReferralsDto extends DateFilterDto {
  @IsOptional()
  @IsEnum(ReferralResponseFilter)
  companyResponse?: ReferralResponseFilter;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsIn([5, 10, 15])
  limit?: number = 10;
}

export class QueryCompanyEmployersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  accountStatus?: string;
}

export class QueryAttendanceDto extends DateFilterDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export const QC_WORKFLOW_PAGE_SIZES = [5, 10, 15] as const;

export class QcWorkflowPaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn(QC_WORKFLOW_PAGE_SIZES)
  limit = 10;
}

export enum QcAssignmentStatusFilter {
  ACTIVE = 'active',
  CLOSED = 'closed',
  PENDING = 'pending',
  ONGOING = 'ongoing',
  COMPLETE_COMPANY = 'complete_company',
  COMPLETE_STUDENT = 'complete_student',
  WITHDRAWN = 'withdrawn',
  CANCELLED = 'cancelled',
  FINALIZED = 'finalized',
}

export class QcInternshipListQueryDto extends QcWorkflowPaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(QcAssignmentStatusFilter)
  status?: QcAssignmentStatusFilter;
}

export enum QcAttendanceStatusFilter {
  PENDING = 'pending',
  PRESENT = 'present',
  ABSENT = 'absent',
  INCOMPLETE = 'incomplete',
}

export class QcAttendanceListQueryDto extends QcWorkflowPaginationDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(QcAttendanceStatusFilter)
  status?: QcAttendanceStatusFilter;
}

export enum QcAttendanceHistoryStatusFilter {
  PRESENT = 'present',
  ABSENT = 'absent',
  INCOMPLETE = 'incomplete',
}

export class QcAttendanceHistoryQueryDto extends QcWorkflowPaginationDto {
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsEnum(QcAttendanceHistoryStatusFilter)
  status?: QcAttendanceHistoryStatusFilter;
}

export class PesoStudentDashboardMetricsDto {
  totalPendingApplications: number;
  totalVerifiedRequirements: number;
  totalActiveEmployers: number;
  totalAvailableOpportunities: number;
}

export class PesoApplicationManagementMetricsDto {
  pendingApplications: number;
  verifiedRequirements: number;
  rejectedSubmissions: number;
}

export class PesoEmployerDashboardMetricsDto {
  totalPartnerEmployers: number;
  totalAvailableOpportunities: number;
  pendingRegistrations: number;
}

export class PesoDtrDashboardMetricsDto {
  applicantsOvertime: number;
  pendingReview: number;
  accepted: number;
  shortlisted: number;
  rejected: number;
}

export class UpdateApplicationStatusDto {
  @IsEnum(ApplicationStatusFilter)
  status: ApplicationStatusFilter;

  @ValidateIf(
    (dto: UpdateApplicationStatusDto) =>
      dto.status === ApplicationStatusFilter.REJECTED_FOR_REFERRAL,
  )
  @IsString()
  @IsNotEmpty()
  remark?: string;
}
