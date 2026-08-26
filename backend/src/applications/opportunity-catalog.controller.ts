import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PesoApprovedGuard } from '../auth/guards/peso-approved.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/account.entities';
import { UsersService } from '../users/users.service';
import { OpportunityCatalogService } from './opportunity-catalog.service';
import { OpportunityCatalogQueryDto } from './dto/opportunity-catalog.dto';

@Controller('opportunities')
@UseGuards(JwtAuthGuard, RolesGuard, PesoApprovedGuard)
@Roles(UserRole.STUDENT, UserRole.PESO_PERSONNEL, UserRole.ADMIN)
export class OpportunityCatalogController {
  constructor(
    private readonly catalogService: OpportunityCatalogService,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  async getOpportunities(
    @Query() query: OpportunityCatalogQueryDto,
    @CurrentUser('userAccountId') userAccountId: number,
    @CurrentUser('userRole') userRole: UserRole,
  ) {
    let studentId: number | null = null;
    if (userRole === UserRole.STUDENT) {
      const current = await this.usersService.getCurrentAccount(userAccountId);
      studentId = current?.studentId ?? null;
    }
    return this.catalogService.getOpportunities(query, studentId);
  }

  @Get(':opportunityId')
  async getOpportunity(
    @Param('opportunityId', ParseIntPipe) opportunityId: number,
    @CurrentUser('userAccountId') userAccountId: number,
    @CurrentUser('userRole') userRole: UserRole,
  ) {
    let studentId: number | null = null;
    if (userRole === UserRole.STUDENT) {
      const current = await this.usersService.getCurrentAccount(userAccountId);
      studentId = current?.studentId ?? null;
    }
    return this.catalogService.getOpportunityById(opportunityId, studentId);
  }
}
