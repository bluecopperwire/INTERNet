import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
} from 'class-validator';
import {
  DATE_PATTERN,
  EmployerPaginationDto,
  NullableTrim,
  TIME_PATTERN,
  Trim,
} from './common.dto';

export enum CompanyResponse {
  PENDING = 'pending',
  FOR_INTERVIEW = 'for_interview',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export enum StudentResponse {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export enum InterviewMode {
  ONLINE = 'online',
  PHYSICAL = 'physical',
}

export enum ReferralListView {
  REVIEW = 'review',
  HISTORY = 'history',
}

export class ReferralListQueryDto extends EmployerPaginationDto {
  @IsOptional()
  @IsEnum(ReferralListView)
  view?: ReferralListView = ReferralListView.HISTORY;

  @IsOptional()
  @Trim()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CompanyResponse)
  companyResponse?: CompanyResponse;
}

export class ScheduleInterviewDto {
  @Matches(DATE_PATTERN, { message: 'interviewDate must be YYYY-MM-DD' })
  interviewDate!: string;

  @Matches(TIME_PATTERN, { message: 'interviewTime must be HH:mm' })
  interviewTime!: string;

  @IsEnum(InterviewMode)
  interviewMode!: InterviewMode;

  @IsOptional()
  @NullableTrim()
  @IsUrl({ require_protocol: true })
  onlineMeetingUrl?: string | null;

  @IsOptional()
  @NullableTrim()
  @IsString()
  @IsNotEmpty()
  physicalLocation?: string | null;

  @IsOptional()
  @NullableTrim()
  @IsString()
  @IsNotEmpty()
  remark?: string | null;
}

export class RejectReferralDto {
  @NullableTrim()
  @IsString()
  @IsNotEmpty()
  remark!: string;
}

export class AssignmentCandidateQueryDto extends EmployerPaginationDto {
  @IsOptional()
  @Trim()
  @IsString()
  search?: string;

}
