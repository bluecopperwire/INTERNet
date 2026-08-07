import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { StudentProfileDto } from './student-profile.dto';

export class SignupDto extends StudentProfileDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
