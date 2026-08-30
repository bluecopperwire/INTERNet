import { IsDateString, IsOptional } from 'class-validator';

export class StudentAttendanceQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
