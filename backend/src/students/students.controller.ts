import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StudentsService } from './students.service';
import { ApplicationsService } from '../applications/applications.service';

@Controller('students')
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
    private readonly applicationsService: ApplicationsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id/applications')
  @HttpCode(HttpStatus.OK)
  async getStudentApplications(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: any,
  ) {
    const student = await this.studentsService.findById(id);
    if (!student) throw new NotFoundException('Student not found');

    // Allow admins or the user linked to this student
    if (currentUser?.role !== 'admin' && student.studentId !== currentUser?.userId) {
      throw new ForbiddenException('Not authorized to view this');
    }

    return this.applicationsService.findByStudentId(id);
  }
}
