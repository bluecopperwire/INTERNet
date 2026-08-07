import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { InquiryMethod } from '../../users/student.entity';

export class StudentProfileDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  extensionName?: string;

  @IsString()
  @IsNotEmpty()
  sex: string;

  @IsDateString()
  birthDate: string;

  @IsString()
  @IsNotEmpty()
  contactNumber: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  linkedinUrl?: string;

  @IsString()
  @IsNotEmpty()
  addressLine: string;

  @IsString()
  @IsNotEmpty()
  addressBarangay: string;

  @IsString()
  @IsNotEmpty()
  addressDistrict: string;

  @IsString()
  @IsNotEmpty()
  addressCity: string;

  @IsEnum(InquiryMethod)
  inquiryMethod: InquiryMethod;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  photoFilePath?: string;
}
