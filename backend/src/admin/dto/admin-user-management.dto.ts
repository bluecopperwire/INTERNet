import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AccountStatus } from '../../users/entities/account.entities';
import { CompanyType } from '../../common/enums/company-type.enum';
import { WorkSchedule } from '../../common/enums/work-schedule.enum';
import { NullableTrim, Trim } from '../../employer/dto/common.dto';

export enum AdminStudentYearLevel {
  GRADE_11 = 'grade_11',
  GRADE_12 = 'grade_12',
  FIRST_YEAR_COLLEGE = 'first_year_college',
  SECOND_YEAR_COLLEGE = 'second_year_college',
  THIRD_YEAR_COLLEGE = 'third_year_college',
  FOURTH_YEAR_COLLEGE = 'fourth_year_college',
}

export class AdminListQueryDto {
  @IsOptional()
  @Trim()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 7;
}

export class PreferredIndustryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  industryId: number;

  @IsOptional()
  @NullableTrim()
  @IsString()
  customIndustryName?: string | null;
}

export class UpdateAdminStudentDto {
  @IsOptional() @Trim() @IsString() @IsNotEmpty() firstName?: string;
  @IsOptional() @NullableTrim() @IsString() middleName?: string | null;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() lastName?: string;
  @IsOptional() @NullableTrim() @IsString() extensionName?: string | null;
  @IsOptional() @IsDateString({ strict: true }) birthDate?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() sex?: string;

  @IsOptional() @Trim() @IsString() @IsNotEmpty() addressLine?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() addressBarangay?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() addressDistrict?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() addressCity?: string;

  @IsOptional() @Trim() @IsEmail() contactEmail?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() contactNumber?: string;
  @IsOptional()
  @NullableTrim()
  @IsUrl({ require_protocol: true })
  linkedinUrl?: string | null;

  @IsOptional() @Trim() @IsString() @IsNotEmpty() schoolName?: string;
  @IsOptional()
  @IsEnum(AdminStudentYearLevel)
  yearLevel?: AdminStudentYearLevel;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() strandProgram?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) requiredHours?: number;
  @IsOptional() @IsEnum(WorkSchedule) availableDays?: WorkSchedule;
  @IsOptional() @IsDateString({ strict: true }) startDate?: string;
  @IsOptional() @IsEnum(CompanyType) preferredCompanyType?: CompanyType;
  @IsOptional() @IsBoolean() allowsOutsidePreferredField?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferredIndustryDto)
  preferredIndustries?: PreferredIndustryDto[];
}

export class CreateAdminEmployerDto {
  @Trim() @IsEmail() accountEmail: string;
  @IsString() @MinLength(8) initialPassword: string;
  @Trim() @IsString() @IsNotEmpty() companyName: string;
  @IsEnum(CompanyType) companyType: CompanyType;
  @Type(() => Number) @IsInt() @Min(1) industryId: number;
  @Type(() => Number) @IsInt() @Min(1) companySize: number;
  @Type(() => Number)
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  yearEstablished: number;
  @IsOptional() @NullableTrim() @IsUrl({ require_protocol: true }) websiteUrl?:
    string | null;
  @Trim() @IsString() @IsNotEmpty() description: string;
  @Trim() @IsString() @IsNotEmpty() addressLine: string;
  @Trim() @IsString() @IsNotEmpty() addressBarangay: string;
  @IsOptional() @NullableTrim() @IsString() addressDistrict?: string | null;
  @Trim() @IsString() @IsNotEmpty() addressCity: string;
  @Trim() @IsString() @IsNotEmpty() contactPersonFirstName: string;
  @IsOptional() @NullableTrim() @IsString() contactPersonMiddleName?:
    string | null;
  @Trim() @IsString() @IsNotEmpty() contactPersonLastName: string;
  @IsOptional() @NullableTrim() @IsString() contactPersonExtensionName?:
    string | null;
  @Trim() @IsEmail() contactEmail: string;
  @Trim() @IsString() @IsNotEmpty() contactNumber: string;
}

export class UpdateAdminEmployerDto {
  @IsOptional() @Trim() @IsString() @IsNotEmpty() companyName?: string;
  @IsOptional() @IsEnum(CompanyType) companyType?: CompanyType;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) industryId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) companySize?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1800)
  @Max(new Date().getFullYear())
  yearEstablished?: number;
  @IsOptional() @NullableTrim() @IsUrl({ require_protocol: true }) websiteUrl?:
    string | null;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() description?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() addressLine?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() addressBarangay?: string;
  @IsOptional() @NullableTrim() @IsString() addressDistrict?: string | null;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() addressCity?: string;
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  contactPersonFirstName?: string;
  @IsOptional() @NullableTrim() @IsString() contactPersonMiddleName?:
    string | null;
  @IsOptional()
  @Trim()
  @IsString()
  @IsNotEmpty()
  contactPersonLastName?: string;
  @IsOptional() @NullableTrim() @IsString() contactPersonExtensionName?:
    string | null;
  @IsOptional() @Trim() @IsEmail() contactEmail?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() contactNumber?: string;
}

export class CreateAdminPesoPersonnelDto {
  @Trim() @IsEmail() accountEmail: string;
  @IsString() @MinLength(8) initialPassword: string;
  @Trim() @IsString() @IsNotEmpty() firstName: string;
  @IsOptional() @NullableTrim() @IsString() middleName?: string | null;
  @Trim() @IsString() @IsNotEmpty() lastName: string;
  @IsOptional() @NullableTrim() @IsString() extensionName?: string | null;
  @Trim() @IsString() @IsNotEmpty() addressLine: string;
  @Trim() @IsString() @IsNotEmpty() addressBarangay: string;
  @Trim() @IsString() @IsNotEmpty() addressDistrict: string;
  @Trim() @IsString() @IsNotEmpty() addressCity: string;
  @IsDateString({ strict: true }) birthDate: string;
  @Trim() @IsString() @IsNotEmpty() sex: string;
  @Trim() @IsEmail() contactEmail: string;
  @Trim() @IsString() @IsNotEmpty() contactNumber: string;
  @Trim() @IsString() @IsNotEmpty() employeeId: string;
  @Trim() @IsString() @IsNotEmpty() department: string;
  @Trim() @IsString() @IsNotEmpty() position: string;
}

export class UpdateAdminPesoPersonnelDto {
  @IsOptional() @Trim() @IsString() @IsNotEmpty() firstName?: string;
  @IsOptional() @NullableTrim() @IsString() middleName?: string | null;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() lastName?: string;
  @IsOptional() @NullableTrim() @IsString() extensionName?: string | null;
  @IsOptional() @IsDateString({ strict: true }) birthDate?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() sex?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() addressLine?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() addressBarangay?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() addressDistrict?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() addressCity?: string;
  @IsOptional() @Trim() @IsEmail() contactEmail?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() contactNumber?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() employeeId?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() department?: string;
  @IsOptional() @Trim() @IsString() @IsNotEmpty() position?: string;
}

export class UpdateAdminAccountStatusDto {
  @IsEnum(AccountStatus)
  status: AccountStatus;

  @ValidateIf(
    (dto: UpdateAdminAccountStatusDto) =>
      dto.status === AccountStatus.SUSPENDED,
  )
  @Type(() => Number)
  @IsInt()
  @Min(1)
  suspensionDays?: number;
}
