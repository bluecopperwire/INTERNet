import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { createReadStream } from 'node:fs';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/account.entities';
import {
  ReferralListQueryDto,
  RejectReferralDto,
  ScheduleInterviewDto,
} from '../dto';
import { EmployerReferralService } from '../services/employer-referral.service';
import type { EmployerCurrentUser } from '../types/employer.types';

@Controller('employer/referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY)
export class EmployerReferralController {
  constructor(private readonly referralService: EmployerReferralService) {}

  @Get()
  list(
    @CurrentUser() user: EmployerCurrentUser,
    @Query() query: ReferralListQueryDto,
  ) {
    return this.referralService.list(user.userAccountId, query);
  }

  @Get(':referralId')
  getById(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('referralId', ParseIntPipe) referralId: number,
  ) {
    return this.referralService.getById(user.userAccountId, referralId);
  }

  @Patch(':referralId/review')
  review(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('referralId', ParseIntPipe) referralId: number,
  ) {
    return this.referralService.markUnderReview(user.userAccountId, referralId);
  }

  @Patch(':referralId/accept')
  accept(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('referralId', ParseIntPipe) referralId: number,
  ) {
    return this.referralService.accept(user.userAccountId, referralId);
  }

  @Put(':referralId/interview')
  scheduleInterview(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('referralId', ParseIntPipe) referralId: number,
    @Body() dto: ScheduleInterviewDto,
  ) {
    return this.referralService.scheduleInterview(
      user.userAccountId,
      referralId,
      dto,
    );
  }

  @Patch(':referralId/reject')
  reject(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('referralId', ParseIntPipe) referralId: number,
    @Body() dto: RejectReferralDto,
  ) {
    return this.referralService.reject(user.userAccountId, referralId, dto);
  }

  @Get(':referralId/documents/:documentId/download')
  async downloadDocument(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('referralId', ParseIntPipe) referralId: number,
    @Param('documentId', ParseIntPipe) documentId: number,
  ) {
    const file = await this.referralService.getDocumentDownload(
      user.userAccountId,
      referralId,
      documentId,
    );
    return new StreamableFile(createReadStream(file.absolutePath), {
      type: file.mimeType,
      disposition: `attachment; filename="${file.downloadName}"`,
    });
  }

  @Patch(':referralId/withdraw-acceptance')
  withdrawAcceptance(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('referralId', ParseIntPipe) referralId: number,
    @Body() dto: RejectReferralDto,
  ) {
    return this.referralService.withdrawAcceptance(
      user.userAccountId,
      referralId,
      dto,
    );
  }

  @Delete(':referralId')
  hide(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('referralId', ParseIntPipe) referralId: number,
  ) {
    return this.referralService.hide(user.userAccountId, referralId);
  }
}
