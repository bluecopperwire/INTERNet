import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AttendanceRecord,
  InternshipPreference,
  Student,
  StudentAcademicInformation,
  StudentPreferredIndustry,
  StudentRequirementSubmission,
} from './entities';
import { StudentsService } from './services/students.service';
import { StudentsController } from './controllers/students.controller';
import { ApplicationsModule } from '../applications/applications.module';
import { ProfilePictureStorageModule } from '../storage/profile-picture-storage.module';
import { AttendanceResolutionScheduler } from './scheduler/attendance-resolution.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      StudentAcademicInformation,
      InternshipPreference,
      StudentPreferredIndustry,
      StudentRequirementSubmission,
      AttendanceRecord,
    ]),
    ApplicationsModule,
    ProfilePictureStorageModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService, AttendanceResolutionScheduler],
  exports: [StudentsService],
})
export class StudentsModule {}
