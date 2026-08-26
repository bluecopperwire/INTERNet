import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { NullableTrim, Trim } from './common.dto';

export enum EmployerCompanyType {
  PRIVATE = 'private',
  GOVERNMENT = 'government',
}

export class UpdateEmployerProfileDto {
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  companyName?: string;

  @IsOptional()
  @IsEnum(EmployerCompanyType)
  companyType?: EmployerCompanyType;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  industryName?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @NullableTrim()
  @IsUrl({ require_protocol: true })
  websiteUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9999)
  yearEstablished?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  companySize?: number | null;

  @IsOptional()
  @Trim()
  @IsEmail()
  @IsNotEmpty()
  contactEmail?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  contactNumber?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  contactPersonFirstName?: string;

  @IsOptional()
  @NullableTrim()
  @IsString()
  contactPersonMiddleName?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  contactPersonLastName?: string;

  @IsOptional()
  @NullableTrim()
  @IsString()
  contactPersonExtensionName?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  addressLine?: string;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  addressBarangay?: string;

  @IsOptional()
  @NullableTrim()
  @IsString()
  addressDistrict?: string | null;

  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  addressCity?: string;
}
