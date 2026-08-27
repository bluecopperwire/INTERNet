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
  CreatePesoPersonnelAccountDto,
  VerificationDecisionDto,
} from './dto/account-management.dto';
import { UpdatePesoProfileDto } from './dto/peso-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly accounts: AccountManagementService) {}

  @Roles(UserRole.ADMIN)
  @Post('companies')
  createCompany(@Body() dto: CreateCompanyAccountDto) {
    return this.accounts.createCompany(dto);
  }

  @Roles(UserRole.ADMIN)
  @Post('peso-personnel')
  createPesoPersonnel(
    @CurrentUser('userAccountId') adminId: number,
    @Body() dto: CreatePesoPersonnelAccountDto,
  ) {
    return this.accounts.createPesoPersonnel(dto, adminId);
  }

  @Roles(UserRole.PESO_PERSONNEL)
  @Get('peso/profile')
  getPesoProfile(@CurrentUser('userAccountId') id: number) {
    return this.accounts.getPesoProfile(id);
  }

  @Roles(UserRole.PESO_PERSONNEL)
  @Patch('peso/profile')
  updatePesoProfile(
    @CurrentUser('userAccountId') id: number,
    @Body() dto: UpdatePesoProfileDto,
  ) {
    return this.accounts.updatePesoProfile(id, dto);
  }

  @Roles(UserRole.PESO_PERSONNEL)
  @Get('peso/verification-status')
  async verificationStatus(@CurrentUser('userAccountId') id: number) {
    return this.accounts.verificationStatus(id);
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
