import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EmployerPaginationDto, Trim } from './common.dto';

export enum InternshipListStatus {
  PENDING = 'pending',
  ONGOING = 'ongoing',
  AWAITING_COMPLETION = 'awaiting_completion',
  COMPLETED = 'completed',
  WITHDRAWN = 'withdrawn',
  CANCELLED = 'cancelled',
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
