import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class StudentAttendanceQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class StudentAttendanceHistoryQueryDto {
  @IsOptional()
  @IsIn(['present', 'absent', 'incomplete'])
  status?: 'present' | 'absent' | 'incomplete';

  @IsOptional()
  @IsDateString()
  date?: string;

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

export class StudentInternshipHistoryQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn([
    'pending',
    'ongoing',
    'completed',
    'withdrawn',
    'cancelled',
    'finalized',
  ])
  status?:
    | 'pending'
    | 'ongoing'
    | 'completed'
    | 'withdrawn'
    | 'cancelled'
    | 'finalized';

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
