import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class StudentProfileDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsOptional() @IsString() middleName?: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsOptional() @IsString() extensionName?: string;
  @IsString() @IsNotEmpty() sex: string;
  @IsDateString() birthDate: string;
  @IsString() @IsNotEmpty() contactNumber: string;
  @IsOptional() @IsString() linkedinUrl?: string;
  @IsString() @IsNotEmpty() addressLine: string;
  @IsString() @IsNotEmpty() addressBarangay: string;
  @IsString() @IsNotEmpty() addressDistrict: string;
  @IsString() @IsNotEmpty() addressCity: string;
  @IsIn(['walk_in', 'online', 'phone_call', 'school']) inquiryMethod: string;
  @IsOptional() @IsString() photoFilePath?: string;
}

export class SignupDto extends StudentProfileDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}

export class GoogleStudentCompletionDto extends StudentProfileDto {}

export class PasswordDto {
  @IsString() @MinLength(8) password: string;
}

export class ChangePasswordDto extends PasswordDto {
  @IsString() @MinLength(8) currentPassword: string;
}
