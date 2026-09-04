import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import {
  DATE_PATTERN,
  EmployerWorkflowPaginationDto,
  Trim,
} from './common.dto';

export enum AttendanceDisplayStatus {
  PENDING = 'pending',
  PRESENT = 'present',
  ABSENT = 'absent',
  INCOMPLETE = 'incomplete',
}

export class AttendanceDateQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}

export class AttendanceListQueryDto extends EmployerWorkflowPaginationDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @Trim()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AttendanceDisplayStatus)
  status?: AttendanceDisplayStatus;
}

export enum AttendanceHistoryStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  INCOMPLETE = 'incomplete',
}

export class AttendanceHistoryQueryDto extends EmployerWorkflowPaginationDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsEnum(AttendanceHistoryStatus)
  status?: AttendanceHistoryStatus;
}
