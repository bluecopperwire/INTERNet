import { Module } from '@nestjs/common';
import { EmployerAssignmentController } from './controllers/employer-assignment.controller';
import { EmployerAttendanceController } from './controllers/employer-attendance.controller';
import { EmployerInternshipController } from './controllers/employer-internship.controller';
import { EmployerOpportunityController } from './controllers/employer-opportunity.controller';
import { EmployerProfileController } from './controllers/employer-profile.controller';
import { EmployerReferralController } from './controllers/employer-referral.controller';
import { AssignmentStartScheduler } from './scheduler/assignment-start.scheduler';
import { EmployerLogoStorageService } from './storage/employer-logo-storage.service';
import { EmployerAttendanceService } from './services/employer-attendance.service';
import { EmployerCompanyResolver } from './services/company-resolver.service';
import { EmployerInternshipService } from './services/employer-internship.service';
import { EmployerOpportunityService } from './services/employer-opportunity.service';
import { EmployerProfileService } from './services/employer-profile.service';
import { EmployerReferralService } from './services/employer-referral.service';

@Module({
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
    EmployerLogoStorageService,
    EmployerProfileService,
    EmployerOpportunityService,
    EmployerReferralService,
    EmployerInternshipService,
    EmployerAttendanceService,
    AssignmentStartScheduler,
  ],
})
export class EmployerModule {}
