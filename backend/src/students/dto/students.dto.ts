import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { YearLevel } from '../../common/enums/year-level.enum';
import { WorkSchedule } from '../../common/enums/work-schedule.enum';
import { CompanyType } from '../../common/enums/company-type.enum';
import { InquiryMethod } from '../../common/enums/student-inquiry-method.enum';

// DTO layer: request/response contract for the API, not the database model.
export class StudentAcademicProfileDto {
  @IsString()
  @IsNotEmpty()
  schoolName!: string;

  @IsEnum(YearLevel, {
    message: `yearLevel must be one of: ${Object.values(YearLevel).join(', ')}`,
  })
  yearLevel!: YearLevel;

  @IsString()
  @IsNotEmpty()
  strandProgram!: string;
}

export class InternshipPreferenceDto {
  @IsInt()
  @Min(1)
  requiredHours!: number;

  @IsEnum(WorkSchedule, {
    message: `availableDays must be one of: ${Object.values(WorkSchedule).join(', ')}`,
  })
  availableDays!: WorkSchedule;

  @IsEnum(CompanyType, {
    message: `preferredCompanyType must be one of: ${Object.values(CompanyType).join(', ')}`,
  })
  preferredCompanyType!: CompanyType;

  @IsDateString()
  startDate!: string;

  @IsBoolean()
  allowsOutsidePreferredField!: boolean;
}

export class StudentPreferredIndustryDto {
  @IsInt()
  @Min(1)
  industryId!: number;

  @IsOptional()
  @IsString()
  customIndustryName?: string;
}

export class StudentProfileUpdateDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  extensionName?: string;

  @IsString()
  @IsNotEmpty()
  sex!: string;

  @IsDateString()
  birthDate!: string;

  @IsString()
  @IsNotEmpty()
  contactNumber!: string;

  @IsString()
  @IsNotEmpty()
  contactEmail!: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsString()
  @IsNotEmpty()
  addressLine!: string;

  @IsString()
  @IsNotEmpty()
  addressBarangay!: string;

  @IsString()
  @IsNotEmpty()
  addressDistrict!: string;

  @IsString()
  @IsNotEmpty()
  addressCity!: string;

  @IsEnum(InquiryMethod, {
    message: `inquiryMethod must be one of: ${Object.values(InquiryMethod).join(', ')}`,
  })
  inquiryMethod!: InquiryMethod;

  @IsOptional()
  @IsString()
  photoFilePath?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => StudentAcademicProfileDto)
  academic?: StudentAcademicProfileDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => InternshipPreferenceDto)
  internshipPreference?: InternshipPreferenceDto;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => StudentPreferredIndustryDto)
  preferredIndustries?: StudentPreferredIndustryDto[];
}

export class StudentRequirementUploadDto {
  @IsString()
  @IsNotEmpty()
  requirementType!: string;

  @IsOptional()
  @IsString()
  requirementName?: string;
}

export class StudentApplicationStatusQueryDto {
  @IsInt()
  @Min(1)
  applicationId!: number;
}

export class StudentAttendanceClockDto {
  @IsInt()
  @Min(1)
  internshipAssignmentId!: number;

  @IsOptional()
  @IsString()
  timeIn?: string;

  @IsOptional()
  @IsString()
  timeOut?: string;

  @IsOptional()
  @IsString()
  photoFilePath?: string;
}
