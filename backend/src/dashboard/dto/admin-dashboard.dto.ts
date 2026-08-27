import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AccountStatus } from '../../users/entities/account.entities';

export class AdminDashboardMetricsDto {
  totalRegistered: number;
  activeAccounts: number;
  deactivatedAccounts: number;
}

export class UpdateStudentAccountDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  accountStatus?: AccountStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsString()
  extensionName?: string;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  addressBarangay?: string;

  @IsOptional()
  @IsString()
  addressDistrict?: string;

  @IsOptional()
  @IsString()
  addressCity?: string;

  @IsOptional()
  @IsString()
  schoolName?: string;

  @IsOptional()
  @IsIn([
    'grade_11',
    'grade_12',
    'first_year_college',
    'second_year_college',
    'third_year_college',
    'fourth_year_college',
  ])
  yearLevel?: string;

  @IsOptional()
  @IsString()
  strandProgram?: string;
}

export class UpdateEmployerAccountDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  accountStatus?: AccountStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  companyName?: string;

  @IsOptional()
  @IsIn(['government', 'private'])
  companyType?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsInt()
  yearEstablished?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  companySize?: number;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsString()
  contactPersonFirstName?: string;

  @IsOptional()
  @IsString()
  contactPersonMiddleName?: string;

  @IsOptional()
  @IsString()
  contactPersonLastName?: string;

  @IsOptional()
  @IsString()
  contactPersonExtensionName?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  addressBarangay?: string;

  @IsOptional()
  @IsString()
  addressDistrict?: string;

  @IsOptional()
  @IsString()
  addressCity?: string;
}

export class UpdatePesoPersonnelAccountDto {
  @IsOptional()
  @IsEnum(AccountStatus)
  accountStatus?: AccountStatus;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  lastName?: string;

  @IsOptional()
  @IsString()
  extensionName?: string;

  @IsOptional()
  @IsString()
  sex?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  addressLine?: string;

  @IsOptional()
  @IsString()
  addressBarangay?: string;

  @IsOptional()
  @IsString()
  addressDistrict?: string;

  @IsOptional()
  @IsString()
  addressCity?: string;

}
