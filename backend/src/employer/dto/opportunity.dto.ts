import { Type } from 'class-transformer';
import {
  IsEnum,
  IsBoolean,
  IsDefined,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  DATE_PATTERN,
  EmployerPaginationDto,
  NullableTrim,
  Trim,
} from './common.dto';

export enum OpportunityStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export enum WorkArrangement {
  ONSITE = 'onsite',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
}

export class OpportunityListQueryDto extends EmployerPaginationDto {
  limit = 7;

  @IsOptional()
  @IsEnum(OpportunityStatus)
  status?: OpportunityStatus;
}

export class CreateOpportunityDto {
  @Trim()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @Trim()
  @IsString()
  @IsNotEmpty()
  department!: string;

  @IsEnum(WorkArrangement)
  workArrangement!: WorkArrangement;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  minimumRequiredHours!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  offeredSlots!: number;

  @IsOptional()
  @IsBoolean()
  @ValidateIf((_object, value: unknown) => value !== undefined)
  hasAllowance?: boolean;

  @IsOptional()
  @NullableTrim()
  @ValidateIf((_object, value: unknown) => value !== null && value !== undefined)
  @IsString()
  @IsNotEmpty()
  allowance?: string | null;

  @Trim()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @NullableTrim()
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsDefined()
  @IsString()
  @IsNotEmpty()
  qualification!: string | null;

  @Matches(DATE_PATTERN, { message: 'applicationDeadline must be YYYY-MM-DD' })
  applicationDeadline!: string;
}

export class UpdateOpportunityDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  department?: string;

  @IsOptional()
  @IsEnum(WorkArrangement)
  workArrangement?: WorkArrangement;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minimumRequiredHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  offeredSlots?: number;

  @IsOptional()
  @IsBoolean()
  hasAllowance?: boolean;

  @IsOptional()
  @NullableTrim()
  @ValidateIf((_object, value: unknown) => value !== null && value !== undefined)
  @IsString()
  @IsNotEmpty()
  allowance?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @NullableTrim()
  @IsString()
  @IsNotEmpty()
  qualification?: string | null;

  @IsOptional()
  @Matches(DATE_PATTERN, { message: 'applicationDeadline must be YYYY-MM-DD' })
  applicationDeadline?: string;
}
