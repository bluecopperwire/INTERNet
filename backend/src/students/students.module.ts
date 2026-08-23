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
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
