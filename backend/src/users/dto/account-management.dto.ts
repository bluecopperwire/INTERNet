import {
  IsDateString,
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
  @IsOptional() @IsString() @IsNotEmpty() logoFilePath?: string;
}

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
  @IsOptional() @IsString() photoFilePath?: string;
}
