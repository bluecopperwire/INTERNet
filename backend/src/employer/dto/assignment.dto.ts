import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { DATE_PATTERN, TIME_PATTERN } from './common.dto';

export class CreateAssignmentDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays!: number[];

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
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  workingDays?: number[];

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
