import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AUTH_REGISTRATION_ENTITIES } from '../users/entities/account.entities';
import { PesoDashboardController } from './controllers/peso-dashboard.controller';
import { EmployerDashboardController } from './controllers/employer-dashboard.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { PesoDashboardService } from './services/peso-dashboard.service';
import { EmployerDashboardService } from './services/employer-dashboard.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { ApplicationQueryService } from './services/shared/application-query.service';
import { AttendanceQueryService } from './services/shared/attendance-query.service';
import { CompanyResolverService } from './services/shared/company-resolver.service';

import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([...AUTH_REGISTRATION_ENTITIES]),
    AdminModule,
  ],
  controllers: [
    PesoDashboardController,
    EmployerDashboardController,
    AdminDashboardController,
  ],
  providers: [
    PesoDashboardService,
    EmployerDashboardService,
    AdminDashboardService,
    ApplicationQueryService,
    AttendanceQueryService,
    CompanyResolverService,
  ],
  exports: [
    PesoDashboardService,
    EmployerDashboardService,
    AdminDashboardService,
  ],
})
export class DashboardModule {}
