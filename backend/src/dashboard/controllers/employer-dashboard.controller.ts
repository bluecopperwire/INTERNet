import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/account.entities';
import { EmployerDashboardService } from '../services/employer-dashboard.service';
import { CompanyResolverService } from '../services/shared/company-resolver.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { DateFilterDto } from '../../common/dto/date-filter.dto';
import { EmployerReportsQueryDto } from '../dto/employer-dashboard.dto';

@Controller('dashboard/employer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY)
export class EmployerDashboardController {
  constructor(
    private readonly employerService: EmployerDashboardService,
    private readonly companyResolver: CompanyResolverService,
  ) {}

  // E1. Employer dashboard metrics
  @Get('metrics')
  async getDashboardMetrics(@CurrentUser('userAccountId') userAccountId: number) {
    const companyId =
      await this.companyResolver.resolveCompanyId(userAccountId);
    return this.employerService.getDashboardMetrics(companyId);
  }

  // E2. Employer application list
  @Get('applications')
  async getEmployerApplications(
    @CurrentUser('userAccountId') userAccountId: number,
    @Query() paginationDto: PaginationDto,
  ) {
    const companyId =
      await this.companyResolver.resolveCompanyId(userAccountId);
    return this.employerService.getEmployerApplications(
      companyId,
      paginationDto,
    );
  }

  // E3. Employer reports dashboard
  @Get('reports')
  async getEmployerReports(
    @CurrentUser('userAccountId') userAccountId: number,
    @Query() queryDto: EmployerReportsQueryDto,
  ) {
    const companyId =
      await this.companyResolver.resolveCompanyId(userAccountId);
    return this.employerService.getEmployerReports(companyId, queryDto);
  }

  // F1. Employer DTR dashboard metrics
  @Get('attendance/metrics')
  async getDtrDashboardMetrics(
    @CurrentUser('userAccountId') userAccountId: number,
    @Query() dateFilterDto: DateFilterDto,
  ) {
    const companyId =
      await this.companyResolver.resolveCompanyId(userAccountId);
    return this.employerService.getDtrDashboardMetrics(
      companyId,
      dateFilterDto,
    );
  }

  // F2 & F3. Employer student attendance summary
  @Get('attendance/assignments/:assignmentId')
  async getStudentAttendanceSummary(
    @CurrentUser('userAccountId') userAccountId: number,
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Query() dateFilterDto: DateFilterDto,
  ) {
    const companyId =
      await this.companyResolver.resolveCompanyId(userAccountId);
    return this.employerService.getStudentAttendanceSummary(
      companyId,
      assignmentId,
      dateFilterDto,
    );
  }
}
