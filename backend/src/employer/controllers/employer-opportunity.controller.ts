import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/account.entities';
import {
  CreateOpportunityDto,
  OpportunityListQueryDto,
  ReferralListQueryDto,
  UpdateOpportunityDto,
} from '../dto';
import { EmployerOpportunityService } from '../services/employer-opportunity.service';
import { EmployerReferralService } from '../services/employer-referral.service';
import type { EmployerCurrentUser } from '../types/employer.types';

@Controller('employer/opportunities')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY)
export class EmployerOpportunityController {
  constructor(
    private readonly opportunityService: EmployerOpportunityService,
    private readonly referralService: EmployerReferralService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: EmployerCurrentUser,
    @Query() query: OpportunityListQueryDto,
  ) {
    return this.opportunityService.list(user.userAccountId, query);
  }

  @Post()
  create(
    @CurrentUser() user: EmployerCurrentUser,
    @Body() dto: CreateOpportunityDto,
  ) {
    return this.opportunityService.create(user.userAccountId, dto);
  }

  @Get(':opportunityId/referrals')
  listReferrals(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('opportunityId', ParseIntPipe) opportunityId: number,
    @Query() query: ReferralListQueryDto,
  ) {
    return this.referralService.listForOpportunity(
      user.userAccountId,
      opportunityId,
      query,
    );
  }

  @Get(':opportunityId')
  getById(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('opportunityId', ParseIntPipe) opportunityId: number,
  ) {
    return this.opportunityService.getById(user.userAccountId, opportunityId);
  }

  @Patch(':opportunityId')
  update(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('opportunityId', ParseIntPipe) opportunityId: number,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.opportunityService.update(
      user.userAccountId,
      opportunityId,
      dto,
    );
  }

  @Patch(':opportunityId/close')
  close(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('opportunityId', ParseIntPipe) opportunityId: number,
  ) {
    return this.opportunityService.close(user.userAccountId, opportunityId);
  }

  @Delete(':opportunityId')
  archive(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('opportunityId', ParseIntPipe) opportunityId: number,
  ) {
    return this.opportunityService.archive(user.userAccountId, opportunityId);
  }
}
