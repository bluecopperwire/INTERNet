import { Module } from '@nestjs/common';
import { AdminAccountStatusController } from './controllers/admin-account-status.controller';
import { AdminEmployerController } from './controllers/admin-employer.controller';
import { AdminQcPesoController } from './controllers/admin-qc-peso.controller';
import { AdminStudentController } from './controllers/admin-student.controller';
import { AdminUserManagementService } from './services/admin-user-management.service';

@Module({
  controllers: [
    AdminStudentController,
    AdminEmployerController,
    AdminQcPesoController,
    AdminAccountStatusController,
  ],
  providers: [AdminUserManagementService],
  exports: [AdminUserManagementService],
})
export class AdminModule {}
