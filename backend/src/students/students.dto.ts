import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// DTO layer: request/response contract for the API, not the database model.
export class StudentAcademicProfileDto {
  @IsString()
  @IsNotEmpty()
  schoolName!: string;

  @IsString()
  @IsNotEmpty()
  yearLevel!: string;

  @IsString()
  @IsNotEmpty()
  strandProgram!: string;
}

export class InternshipPreferenceDto {
  @IsInt()
  @Min(1)
  requiredHours!: number;

  @IsString()
  @IsIn(['weekdays', 'weekends', 'flexible'])
  availableDays!: string;

  @IsString()
  @IsIn(['government', 'private'])
  preferredCompanyType!: string;

  @IsDateString()
  startDate!: string;

  @IsBoolean()
  allowsOutsidePreferredField!: boolean;
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

  @IsString()
  @IsIn(['walk_in', 'online', 'phone_call', 'school'])
  inquiryMethod!: string;

  @IsOptional()
  @IsString()
  photoFilePath?: string;

  @IsOptional()
  academic?: StudentAcademicProfileDto;

  @IsOptional()
  internshipPreference?: InternshipPreferenceDto;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  preferredIndustries?: Array<{ industryId: number; customIndustryName?: string }>;
}

export class StudentRequirementUploadDto {
  @IsString()
  @IsNotEmpty()
  requirementType!: string;

  @IsString()
  @IsNotEmpty()
  requirementName!: string;

  @IsString()
  @IsNotEmpty()
  requirementFilePath!: string;
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

export class StudentRequirementUploadBatchDto {
  @IsArray()
  @ArrayNotEmpty()
  submissions!: StudentRequirementUploadDto[];
}
