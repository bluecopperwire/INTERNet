import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/account.entities';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  UpdateEmployerAccountDto,
  UpdatePesoPersonnelAccountDto,
  UpdateStudentAccountDto,
} from '../dto/admin-dashboard.dto';

@Controller('dashboard/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  constructor(private readonly adminService: AdminDashboardService) {}

  // G1. Admin student dashboard metrics
  @Get('students/metrics')
  getStudentMetrics() {
    return this.adminService.getStudentMetrics();
  }

  // G2. GET all students
  @Get('students')
  getAllStudents(@Query() paginationDto: PaginationDto) {
    return this.adminService.getAllStudents(paginationDto);
  }

  // G4. GET student account details
  @Get('students/:userAccountId')
  getStudentDetails(
    @Param('userAccountId', ParseIntPipe) userAccountId: number,
  ) {
    return this.adminService.getStudentDetails(userAccountId);
  }

  // G3. PATCH student account details
  @Patch('students/:userAccountId')
  updateStudentAccount(
    @Param('userAccountId', ParseIntPipe) userAccountId: number,
    @CurrentUser('userAccountId') adminAccountId: number,
    @Body() dto: UpdateStudentAccountDto,
  ) {
    return this.adminService.updateStudentAccount(
      userAccountId,
      adminAccountId,
      dto,
    );
  }

  // H1. Admin employer dashboard metrics
  @Get('employers/metrics')
  getEmployerMetrics() {
    return this.adminService.getEmployerMetrics();
  }

  // H2. GET all employers
  @Get('employers')
  getAllEmployers(@Query() paginationDto: PaginationDto) {
    return this.adminService.getAllEmployers(paginationDto);
  }

  // H4. GET employer account details
  @Get('employers/:userAccountId')
  getEmployerDetails(
    @Param('userAccountId', ParseIntPipe) userAccountId: number,
  ) {
    return this.adminService.getEmployerDetails(userAccountId);
  }

  // H3. PATCH employer account details
  @Patch('employers/:userAccountId')
  updateEmployerAccount(
    @Param('userAccountId', ParseIntPipe) userAccountId: number,
    @CurrentUser('userAccountId') adminAccountId: number,
    @Body() dto: UpdateEmployerAccountDto,
  ) {
    return this.adminService.updateEmployerAccount(
      userAccountId,
      adminAccountId,
      dto,
    );
  }

  // I1. Admin PESO dashboard metrics
  @Get('peso-personnel/metrics')
  getPesoPersonnelMetrics() {
    return this.adminService.getPesoPersonnelMetrics();
  }

  // I2. GET all PESO accounts
  @Get('peso-personnel')
  getAllPesoPersonnel(@Query() paginationDto: PaginationDto) {
    return this.adminService.getAllPesoPersonnel(paginationDto);
  }

  // I4. GET PESO account details
  @Get('peso-personnel/:userAccountId')
  getPesoPersonnelDetails(
    @Param('userAccountId', ParseIntPipe) userAccountId: number,
  ) {
    return this.adminService.getPesoPersonnelDetails(userAccountId);
  }

  // I3. PATCH PESO account details / verification
  @Patch('peso-personnel/:userAccountId')
  updatePesoPersonnelAccount(
    @Param('userAccountId', ParseIntPipe) userAccountId: number,
    @CurrentUser('userAccountId') adminAccountId: number,
    @Body() dto: UpdatePesoPersonnelAccountDto,
  ) {
    return this.adminService.updatePesoPersonnelAccount(
      userAccountId,
      adminAccountId,
      dto,
    );
  }
}
