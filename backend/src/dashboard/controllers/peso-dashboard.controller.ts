import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/account.entities';
import { PesoDashboardService } from '../services/peso-dashboard.service';
import { CreateAdminEmployerDto } from '../../admin/dto/admin-user-management.dto';
import {
  QueryApplicationsDto,
  QueryAttendanceDto,
  QueryCompanyEmployersDto,
  QueryReferralsDto,
  UpdateApplicationStatusDto,
} from '../dto/peso-dashboard.dto';
import { DateFilterDto } from '../../common/dto/date-filter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('dashboard/peso')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PESO_PERSONNEL)
export class PesoDashboardController {
  constructor(private readonly pesoService: PesoDashboardService) {}

  // A1. Student dashboard metrics
  @Get('students/metrics')
  getStudentDashboardMetrics() {
    return this.pesoService.getStudentDashboardMetrics();
  }

  // A2. GET all student applications
  @Get('applications')
  getAllStudentApplications(@Query() queryDto: QueryApplicationsDto) {
    return this.pesoService.getAllStudentApplications(queryDto, queryDto);
  }

  // A3. Application management dashboard metrics
  @Get('applications/metrics')
  getApplicationManagementMetrics(@Query() dateFilterDto: DateFilterDto) {
    return this.pesoService.getApplicationManagementMetrics(dateFilterDto);
  }

  // B1. GET all companies
  @Get('employers')
  getAllCompanies(@Query() queryDto: QueryCompanyEmployersDto) {
    return this.pesoService.getAllCompanies(queryDto);
  }

  // B2. PESO employer dashboard metrics
  @Get('employers/metrics')
  getEmployerDashboardMetrics() {
    return this.pesoService.getEmployerDashboardMetrics();
  }

  // C1. GET all referrals
  @Get('referrals')
  getAllReferrals(@Query() queryDto: QueryReferralsDto) {
    return this.pesoService.getAllReferrals(queryDto, queryDto);
  }

  // D1. GET students with DTR entries
  @Get('interns')
  getStudentsWithDtr(@Query() dateFilterDto: DateFilterDto) {
    return this.pesoService.getStudentsWithDtr(dateFilterDto, dateFilterDto);
  }

  // D2. GET DTR dashboard details
  @Get('interns/metrics')
  getDtrDashboardMetrics() {
    return this.pesoService.getDtrDashboardMetrics();
  }

  // D3. GET all DTR entries
  @Get('attendance')
  getAllDtrEntries(@Query() queryDto: QueryAttendanceDto) {
    return this.pesoService.getAllDtrEntries(queryDto, queryDto);
  }

  // D4. GET DTR entry per student
  @Get('attendance/assignments/:assignmentId')
  getDtrPerStudent(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Query() dateFilterDto: DateFilterDto,
  ) {
    return this.pesoService.getDtrPerStudent(assignmentId, dateFilterDto);
  }

  // Direct Detail / Monitor Endpoints
  @Get('applications/:applicationId')
  getApplicationDetail(
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ) {
    return this.pesoService.getApplicationDetail(applicationId);
  }

  @Patch('applications/:applicationId/status')
  updateApplicationStatus(
    @CurrentUser('userAccountId') userAccountId: number,
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.pesoService.updateApplicationStatus(
      userAccountId,
      applicationId,
      dto,
    );
  }

  @Get('referrals/:referralId')
  getReferralDetail(@Param('referralId', ParseIntPipe) referralId: number) {
    return this.pesoService.getReferralDetail(referralId);
  }

  @Get('interns/:internshipAssignmentId')
  getInternDetail(
    @Param('internshipAssignmentId', ParseIntPipe)
    internshipAssignmentId: number,
  ) {
    return this.pesoService.getInternDetail(internshipAssignmentId);
  }

  @Get('students')
  getStudents(@Query() queryDto: PaginationDto & { search?: string }) {
    return this.pesoService.getStudents(queryDto);
  }

  @Get('students/:studentId')
  getStudentDetail(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.pesoService.getStudentDetail(studentId);
  }

  @Get('employers/:companyId')
  getEmployerDetail(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.pesoService.getEmployerDetail(companyId);
  }

  @Post('employers')
  createEmployer(@Body() dto: CreateAdminEmployerDto) {
    return this.pesoService.createEmployer(dto);
  }
}
