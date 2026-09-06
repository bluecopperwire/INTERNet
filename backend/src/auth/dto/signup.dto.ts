import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  IsStrongPassword,
  IsValidContactNumber,
} from '../../common/validation/input-validation';

export class StudentProfileDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsOptional() @IsString() middleName?: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsOptional() @IsString() extensionName?: string;
  @IsIn(['male', 'female']) sex: 'male' | 'female';
  @IsDateString() birthDate: string;
  @IsString() @IsNotEmpty() @IsValidContactNumber() contactNumber: string;
  @IsOptional() @IsString() linkedinUrl?: string;
  @IsString() @IsNotEmpty() addressLine: string;
  @IsString() @IsNotEmpty() addressBarangay: string;
  @IsString() @IsNotEmpty() addressDistrict: string;
  @IsString() @IsNotEmpty() addressCity: string;
  @IsIn(['walk_in', 'online', 'phone_call', 'school'])
  inquiryMethod: 'walk_in' | 'online' | 'phone_call' | 'school';
  @IsOptional() @IsString() photoFilePath?: string;
}

export class SignupDto extends StudentProfileDto {
  @IsEmail() email: string;
  @IsString() @IsStrongPassword() password: string;
}

export class GoogleStudentCompletionDto extends StudentProfileDto {}

export class PasswordDto {
  @IsString() @IsStrongPassword() password: string;
}

export class ChangePasswordDto extends PasswordDto {
  @IsString() @MinLength(8) currentPassword: string;
}
