import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './students.entity';
import { StudentAcademicInformation } from './students.academic.entity';
import { InternshipPreference } from './students.internship-preference.entity';
import { StudentPreferredIndustry } from './students.preferred-industry.entity';
import { StudentRequirementSubmission } from './students.requirement.entity';
import { AttendanceRecord } from './students.attendance.entity';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
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
