import {
<<<<<<< HEAD
  IsDateString,
=======
>>>>>>> 356f4ea08d5cd2e67b211deecbbf4c69488c9fdd
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCompanyAccountDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsInt() @Min(1) industryId: number;
  @IsString() @IsNotEmpty() companyName: string;
  @IsIn(['government', 'private']) companyType: string;
  @IsString() @IsNotEmpty() description: string;
  @IsOptional() @IsString() websiteUrl?: string;
  @IsOptional() @IsInt() yearEstablished?: number;
  @IsOptional() @IsInt() @Min(1) companySize?: number;
  @IsEmail() contactEmail: string;
  @IsString() @IsNotEmpty() contactNumber: string;
  @IsString() @IsNotEmpty() contactPersonFirstName: string;
  @IsOptional() @IsString() contactPersonMiddleName?: string;
  @IsString() @IsNotEmpty() contactPersonLastName: string;
  @IsOptional() @IsString() contactPersonExtensionName?: string;
  @IsString() @IsNotEmpty() addressLine: string;
  @IsString() @IsNotEmpty() addressBarangay: string;
  @IsOptional() @IsString() addressDistrict?: string;
  @IsString() @IsNotEmpty() addressCity: string;
  @IsString() @IsNotEmpty() logoFilePath: string;
}

export class VerificationDecisionDto {
  @IsOptional() @IsString() remark?: string;
}

export class CorrectPesoPersonnelDto {
  @IsOptional() @IsString() @IsNotEmpty() employeeId?: string;
  @IsOptional() @IsString() @IsNotEmpty() position?: string;
  @IsOptional() @IsString() @IsNotEmpty() department?: string;
  @IsOptional() @IsString() @IsNotEmpty() contactNumber?: string;
  @IsOptional() @IsString() @IsNotEmpty() addressLine?: string;
  @IsOptional() @IsString() @IsNotEmpty() addressBarangay?: string;
  @IsOptional() @IsString() @IsNotEmpty() addressDistrict?: string;
  @IsOptional() @IsString() @IsNotEmpty() addressCity?: string;
  @IsOptional() @IsString() employeeIdFileBase64?: string;
  @IsOptional()
  @IsIn(['image/jpeg', 'image/png', 'application/pdf'])
  employeeIdFileMimeType?: string;
  @IsOptional() @IsString() employeeIdFileName?: string;
}
<<<<<<< HEAD

export class CreatePesoPersonnelAccountDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() @IsNotEmpty() firstName: string;
  @IsOptional() @IsString() middleName?: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsOptional() @IsString() extensionName?: string;
  @IsString() @IsNotEmpty() sex: string;
  @IsDateString() birthDate: string;
  @IsString() @IsNotEmpty() addressLine: string;
  @IsString() @IsNotEmpty() addressBarangay: string;
  @IsString() @IsNotEmpty() addressDistrict: string;
  @IsString() @IsNotEmpty() addressCity: string;
  @IsString() @IsNotEmpty() contactNumber: string;
  @IsString() @IsNotEmpty() employeeId: string;
  @IsString() @IsNotEmpty() position: string;
  @IsString() @IsNotEmpty() department: string;
  @IsString() @IsNotEmpty() employeeIdFileBase64: string;
  @IsIn(['image/jpeg', 'image/png', 'application/pdf'])
  employeeIdFileMimeType: string;
  @IsOptional() @IsString() employeeIdFileName?: string;
  @IsOptional() @IsString() photoFilePath?: string;
}
=======
>>>>>>> 356f4ea08d5cd2e67b211deecbbf4c69488c9fdd
