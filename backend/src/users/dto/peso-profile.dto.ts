import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdatePesoProfileDto {
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
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  addressLine?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  addressBarangay?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  addressDistrict?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  addressCity?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
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
  photoFilePath?: string;
}
