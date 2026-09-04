import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EmployerWorkflowPaginationDto, Trim } from './common.dto';

export enum InternshipListStatus {
  PENDING = 'pending',
  ONGOING = 'ongoing',
  AWAITING_COMPLETION = 'awaiting_completion',
}

export enum InternshipHistoryStatus {
  PENDING = 'pending',
  ONGOING = 'ongoing',
  COMPLETE_COMPANY = 'complete_company',
  COMPLETE_STUDENT = 'complete_student',
  WITHDRAWN = 'withdrawn',
  CANCELLED = 'cancelled',
  FINALIZED = 'finalized',
}

export class InternshipListQueryDto extends EmployerWorkflowPaginationDto {
  @IsOptional()
  @Trim()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(InternshipListStatus)
  status?: InternshipListStatus;
}

export class InternshipHistoryQueryDto extends EmployerWorkflowPaginationDto {
  @IsOptional()
  @Trim()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(InternshipHistoryStatus)
  status?: InternshipHistoryStatus;
}

export class DeleteInternshipDto {}

export class AssignmentRemarkDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  remark!: string;
}
