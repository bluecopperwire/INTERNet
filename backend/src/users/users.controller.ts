import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  PersonnelVerificationStatus,
  UserRole,
} from './entities/account.entities';
import { AccountManagementService } from './account-management.service';
import {
  CorrectPesoPersonnelDto,
  CreateCompanyAccountDto,
<<<<<<< HEAD
  CreatePesoPersonnelAccountDto,
=======
>>>>>>> 356f4ea08d5cd2e67b211deecbbf4c69488c9fdd
  VerificationDecisionDto,
} from './dto/account-management.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly accounts: AccountManagementService) {}

  @Roles(UserRole.ADMIN)
  @Post('companies')
  createCompany(@Body() dto: CreateCompanyAccountDto) {
    return this.accounts.createCompany(dto);
  }

<<<<<<< HEAD
  @Roles(UserRole.ADMIN)
  @Post('peso-personnel')
  createPesoPersonnel(
    @CurrentUser('userAccountId') adminId: number,
    @Body() dto: CreatePesoPersonnelAccountDto,
  ) {
    return this.accounts.createPesoPersonnel(dto, adminId);
  }

=======
>>>>>>> 356f4ea08d5cd2e67b211deecbbf4c69488c9fdd
  @Roles(UserRole.PESO_PERSONNEL)
  @Get('peso/verification-status')
  async verificationStatus(@CurrentUser('userAccountId') id: number) {
    const p = await this.accounts.verificationStatus(id);
    return {
      verificationStatus: p.verificationStatus,
      reviewedAt: p.reviewedAt,
      verificationRemark: p.verificationRemark,
    };
  }

  @Roles(UserRole.PESO_PERSONNEL)
  @Patch('peso/rejected-correction')
  correct(
    @CurrentUser('userAccountId') id: number,
    @Body() dto: CorrectPesoPersonnelDto,
  ) {
    return this.accounts.correctRejected(id, dto);
  }

  @Roles(UserRole.PESO_PERSONNEL)
  @Post('peso/resubmit')
  resubmit(@CurrentUser('userAccountId') id: number) {
    return this.accounts.resubmit(id);
  }

  @Roles(UserRole.ADMIN)
  @Get('admin/peso-verifications/pending')
  pending() {
    return this.accounts.pendingVerifications();
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/peso-verifications/:id/approve')
  approve(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userAccountId') admin: number,
    @Body() dto: VerificationDecisionDto,
  ) {
    return this.accounts.decideVerification(
      id,
      admin,
      PersonnelVerificationStatus.APPROVED,
      dto.remark,
    );
  }

  @Roles(UserRole.ADMIN)
  @Post('admin/peso-verifications/:id/reject')
  reject(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('userAccountId') admin: number,
    @Body() dto: VerificationDecisionDto,
  ) {
    return this.accounts.decideVerification(
      id,
      admin,
      PersonnelVerificationStatus.REJECTED,
      dto.remark,
    );
  }
}
