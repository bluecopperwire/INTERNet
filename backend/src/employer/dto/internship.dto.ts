import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EmployerPaginationDto, Trim } from './common.dto';

export enum InternshipListStatus {
  PENDING = 'pending',
  ONGOING = 'ongoing',
  AWAITING_COMPLETION = 'awaiting_completion',
  COMPLETE_COMPANY = 'complete_company',
  COMPLETE_STUDENT = 'complete_student',
  WITHDRAWN = 'withdrawn',
  CANCELLED = 'cancelled',
  FINALIZED = 'finalized',
}

export class InternshipListQueryDto extends EmployerPaginationDto {
  @IsOptional()
  @Trim()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(InternshipListStatus)
  status?: InternshipListStatus;
}

export class DeleteInternshipDto {}

export class AssignmentRemarkDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  remark!: string;
}
