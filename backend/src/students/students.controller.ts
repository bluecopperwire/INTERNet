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
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StudentsService } from './students.service';
import { ApplicationsService } from '../applications/applications.service';
import {
  StudentApplicationStatusQueryDto,
  StudentAttendanceClockDto,
  StudentProfileUpdateDto,
  StudentRequirementUploadBatchDto,
} from './students.dto';

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

  @UseGuards(JwtAuthGuard)
  @Get(':id/applications')
  @HttpCode(HttpStatus.OK)
  async getStudentApplications(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.applicationsService.findByStudentId(id);
  }

  // Returns the current application lifecycle status for a single student application.
  @UseGuards(JwtAuthGuard)
  @Get(':id/applications/:applicationId/status')
  @HttpCode(HttpStatus.OK)
  async getStudentApplicationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @CurrentUser() currentUser: any,
  ) {
    Logger.log(`${id}, ${applicationId}`);
    
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.getStudentApplicationStatus(id, applicationId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/requirements')
  @HttpCode(HttpStatus.CREATED)
  async uploadStudentRequirement(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
    @Body() dto: StudentRequirementUploadBatchDto,
  ) {
    await this.ensureStudentAccess(id, currentUser);
    return this.studentsService.uploadStudentRequirements(id, dto.submissions);
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
