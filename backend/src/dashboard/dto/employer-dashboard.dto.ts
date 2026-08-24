import { IsOptional, IsString, Matches } from 'class-validator';

export class EmployerReportsQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'startDate must be formatted as YYYY-MM-DD',
  })
  startDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'endDate must be formatted as YYYY-MM-DD',
  })
  endDate?: string;
}

export class EmployerDashboardMetricsDto {
  activeOpportunities: number;
  pendingReviews: number;
  totalApplicants: number;
  acceptedCount: number;
  rejectedCount: number;
}

export class EmployerReportsMetricsDto {
  totalApplicants: number;
  accepted: number;
  shortlisted: number;
  rejected: number;
}

export class EmployerDtrDashboardMetricsDto {
  totalActiveInterns: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
}
