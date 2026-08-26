import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/account.entities';
import { AttendanceDateQueryDto, AttendanceListQueryDto } from '../dto';
import { EmployerAttendanceService } from '../services/employer-attendance.service';
import type { EmployerCurrentUser } from '../types/employer.types';

@Controller('employer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY)
export class EmployerAttendanceController {
  constructor(private readonly attendanceService: EmployerAttendanceService) {}

  @Get('attendance/summary')
  summary(
    @CurrentUser() user: EmployerCurrentUser,
    @Query() query: AttendanceDateQueryDto,
  ) {
    return this.attendanceService.summary(user.userAccountId, query);
  }

  @Get('attendance')
  list(
    @CurrentUser() user: EmployerCurrentUser,
    @Query() query: AttendanceListQueryDto,
  ) {
    return this.attendanceService.list(user.userAccountId, query);
  }

  @Get('internships/:internshipAssignmentId/attendance')
  history(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('internshipAssignmentId', ParseIntPipe)
    internshipAssignmentId: number,
  ) {
    return this.attendanceService.history(
      user.userAccountId,
      internshipAssignmentId,
    );
  }
}
