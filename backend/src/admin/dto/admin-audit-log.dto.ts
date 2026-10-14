import { Type } from 'class-transformer';
import {
  IsIn,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Trim } from '../../employer/dto/common.dto';

export const AUDIT_LOG_CATEGORIES = [
  'accounts',
  'applications-referrals',
  'internships',
] as const;

export type AuditLogCategory = (typeof AUDIT_LOG_CATEGORIES)[number];

export class AdminAuditLogQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  action?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([5, 10, 15])
  limit = 5;
}
