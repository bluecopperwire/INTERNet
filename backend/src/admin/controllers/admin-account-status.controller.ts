import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/account.entities';
import { UpdateAdminAccountStatusDto } from '../dto/admin-user-management.dto';
import { AdminUserManagementService } from '../services/admin-user-management.service';

@Controller('admin/accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAccountStatusController {
  constructor(private readonly service: AdminUserManagementService) {}

  @Patch(':userAccountId/status')
  update(
    @Param('userAccountId', ParseIntPipe) userAccountId: number,
    @CurrentUser('userAccountId') adminAccountId: number,
    @Body() dto: UpdateAdminAccountStatusDto,
  ) {
    return this.service.updateAccountStatus(userAccountId, adminAccountId, dto);
  }
}
