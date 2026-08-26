import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { DATE_PATTERN, EmployerPaginationDto, Trim } from './common.dto';

export enum AttendanceDisplayStatus {
  PRESENT = 'present',
  LATE = 'late',
  ABSENT = 'absent',
}

export class AttendanceDateQueryDto {
  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'date must be YYYY-MM-DD' })
  date?: string;
}

export class AttendanceListQueryDto extends EmployerPaginationDto {
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
