import { Module } from '@nestjs/common';
import { EmployerAssignmentController } from './controllers/employer-assignment.controller';
import { EmployerAttendanceController } from './controllers/employer-attendance.controller';
import { EmployerInternshipController } from './controllers/employer-internship.controller';
import { EmployerOpportunityController } from './controllers/employer-opportunity.controller';
import { EmployerProfileController } from './controllers/employer-profile.controller';
import { EmployerReferralController } from './controllers/employer-referral.controller';
import { AssignmentStartScheduler } from './scheduler/assignment-start.scheduler';
import { ProfilePictureStorageModule } from '../storage/profile-picture-storage.module';
import { EmployerAttendanceService } from './services/employer-attendance.service';
import { EmployerCompanyResolver } from './services/company-resolver.service';
import { EmployerInternshipService } from './services/employer-internship.service';
import { EmployerOpportunityService } from './services/employer-opportunity.service';
import { EmployerProfileService } from './services/employer-profile.service';
import { EmployerReferralService } from './services/employer-referral.service';

@Module({
  imports: [ProfilePictureStorageModule],
  controllers: [
    EmployerProfileController,
    EmployerOpportunityController,
    EmployerReferralController,
    EmployerAssignmentController,
    EmployerAttendanceController,
    EmployerInternshipController,
  ],
  providers: [
    EmployerCompanyResolver,
    EmployerProfileService,
    EmployerOpportunityService,
    EmployerReferralService,
    EmployerInternshipService,
    EmployerAttendanceService,
    AssignmentStartScheduler,
  ],
})
export class EmployerModule {}
