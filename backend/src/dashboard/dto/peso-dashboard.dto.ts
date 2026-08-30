import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
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

export enum ReferralResponseFilter {
  PENDING = 'pending',
  FOR_INTERVIEW = 'for_interview',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export class QueryApplicationsDto extends DateFilterDto {
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
  @Max(100)
  limit?: number = 20;
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
  @Max(100)
  limit?: number = 20;
}

export class QueryCompanyEmployersDto extends PaginationDto {
  @IsOptional()
  @IsString()
  accountStatus?: string;
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

  @IsOptional()
  @IsString()
  remark?: string;
}

