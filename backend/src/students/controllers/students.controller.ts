import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { StudentsService } from '../services/students.service';
import { ApplicationsService } from '../../applications/applications.service';
import {
  CreateStudentApplicationDto,
  StudentApplicationResponseDto,
  StudentAttendanceClockDto,
  StudentProfileUpdateDto,
  StudentRequirementUploadDto,
} from '../dto/students.dto';
import { StudentAttendanceQueryDto } from '../dto/student-attendance-query.dto';
import { requirementUploadOptions } from '../../storage/requirement-upload.config';


@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  private async ensureStudentAccess(studentId: number, currentUser: any) {
    const student = await this.studentsService.findById(studentId);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (
      currentUser?.userRole !== 'admin' &&
      student.userAccountId !== currentUser?.userAccountId
    ) {
      throw new ForbiddenException('Not authorized to view this student');
    }

    return student;
  }

  // Fetches the full student profile, academic record, and preference data.
  @UseGuards(JwtAuthGuard)
  @Get(':id/profile')
  @HttpCode(HttpStatus.OK)
  async getStudentProfile(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.getStudentProfile(id);
  }

  // Returns the stored resume submission for the student.
  @UseGuards(JwtAuthGuard)
  @Get(':id/resume')
  @HttpCode(HttpStatus.OK)
  async getStudentResume(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.getStudentResume(id);
  }

  // Returns the student together with all requirement submissions.
  @UseGuards(JwtAuthGuard)
  @Get(':id/requirements')
  @HttpCode(HttpStatus.OK)
  async getStudentRequirements(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.getStudentRequirements(id);
  }

  // Saves the profile form payload and persists the related academic/preference data.
  @UseGuards(JwtAuthGuard)
  @Post(':id/profile')
  @HttpCode(HttpStatus.OK)
  async saveStudentProfile(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
    @Body() dto: StudentProfileUpdateDto,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.upsertStudentProfile(id, dto);
  }

  // Submits a new internship application for an open opportunity.
  @UseGuards(JwtAuthGuard)
  @Post(':id/applications')
  @HttpCode(HttpStatus.CREATED)
  async submitStudentApplication(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
    @Body() dto: CreateStudentApplicationDto,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.createStudentApplication(id, dto, currentUser);
  }

  // Lists all internship applications for the student with enriched opportunity and company data.
  @UseGuards(JwtAuthGuard)
  @Get(':id/applications')
  @HttpCode(HttpStatus.OK)
  async getStudentApplications(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.getStudentApplications(id);
  }

  // Returns the detailed application lifecycle status, referral milestones, interview schedule, and status history.
  @UseGuards(JwtAuthGuard)
  @Get(':id/applications/:applicationId/status')
  @HttpCode(HttpStatus.OK)
  async getStudentApplicationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @CurrentUser() currentUser: any,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.getStudentApplicationStatus(id, applicationId);
  }

  // Submits student response (accepted/declined) to an accepted company referral offer.
  @UseGuards(JwtAuthGuard)
  @Patch(':id/applications/:applicationId/response')
  @HttpCode(HttpStatus.OK)
  async respondToApplicationOffer(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @CurrentUser() currentUser: any,
    @Body() dto: StudentApplicationResponseDto,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.respondToApplicationOffer(
      id,
      applicationId,
      dto,
      currentUser,
    );
  }

  // Allows student to withdraw an active application.
  @UseGuards(JwtAuthGuard)
  @Post(':id/applications/:applicationId/withdraw')
  @HttpCode(HttpStatus.OK)
  async withdrawStudentApplication(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @CurrentUser() currentUser: any,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.withdrawApplication(
      id,
      applicationId,
      currentUser,
    );
  }


  // Accepts physical document upload (multipart/form-data) under backend/uploads/requirements.
  @UseGuards(JwtAuthGuard)
  @Post(':id/requirements')
  @UseInterceptors(FileInterceptor('file', requirementUploadOptions))
  @HttpCode(HttpStatus.CREATED)
  async uploadStudentRequirement(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: StudentRequirementUploadDto,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.uploadRequirementFile(id, file, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/attendance')
  @HttpCode(HttpStatus.OK)
  async getStudentAttendance(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
    @Query() query: StudentAttendanceQueryDto,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.getStudentAttendance(id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/dtr/time-in')
  @HttpCode(HttpStatus.OK)
  async timeInDtr(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
    @Body() dto: StudentAttendanceClockDto,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.timeInDtr(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/dtr/time-out')
  @HttpCode(HttpStatus.OK)
  async timeOutDtr(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
    @Body() dto: StudentAttendanceClockDto,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.timeOutDtr(id, dto);
  }
}
