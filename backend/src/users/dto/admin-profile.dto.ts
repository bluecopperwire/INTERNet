import {
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  IsValidContactNumber,
  IsValidDistrict,
} from '../../common/validation/input-validation';

export class UpdateAdminProfileDto {
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
  @IsIn(['male', 'female'])
  sex?: 'male' | 'female';

  @IsOptional()
  @IsDateString({ strict: true })
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
  @IsValidDistrict()
  addressDistrict?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  addressCity?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @IsValidContactNumber()
  contactNumber?: string;
}
