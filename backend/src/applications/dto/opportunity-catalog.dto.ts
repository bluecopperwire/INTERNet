import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum OpportunityWorkArrangement {
  ONSITE = 'onsite',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
}

export class OpportunityCatalogQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsEnum(OpportunityWorkArrangement)
  workArrangement?: OpportunityWorkArrangement;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  hasAllowance?: boolean;
}
