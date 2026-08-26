import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Matches, Min } from 'class-validator';
import { DATE_PATTERN, TIME_PATTERN } from './common.dto';

export enum EmployerWorkingDays {
  WEEKDAYS = 'weekdays',
  WEEKENDS = 'weekends',
}

export class CreateAssignmentDto {
  @IsEnum(EmployerWorkingDays)
  workingDays!: EmployerWorkingDays;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  requiredHours!: number;

  @Matches(DATE_PATTERN, { message: 'startDate must be YYYY-MM-DD' })
  startDate!: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'expectedEndDate must be YYYY-MM-DD' })
  expectedEndDate?: string | null;

  @Matches(TIME_PATTERN, { message: 'startShift must be HH:mm' })
  startShift!: string;

  @Matches(TIME_PATTERN, { message: 'endShift must be HH:mm' })
  endShift!: string;
}

export class UpdateAssignmentDto {
  @IsOptional()
  @IsEnum(EmployerWorkingDays)
  workingDays?: EmployerWorkingDays;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requiredHours?: number;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'startDate must be YYYY-MM-DD' })
  startDate?: string;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'expectedEndDate must be YYYY-MM-DD' })
  expectedEndDate?: string | null;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startShift must be HH:mm' })
  startShift?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endShift must be HH:mm' })
  endShift?: string;
}
