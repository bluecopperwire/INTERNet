import { IsJWT, IsNotEmpty } from 'class-validator';
import { StudentProfileDto } from './student-profile.dto';

export class GoogleCompleteSignupDto extends StudentProfileDto {
  @IsJWT()
  @IsNotEmpty()
  pendingRegistrationToken: string;
}
