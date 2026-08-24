import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/account.entities';
import { AssignmentCandidateQueryDto, CreateAssignmentDto } from '../dto';
import { EmployerInternshipService } from '../services/employer-internship.service';
import type { EmployerCurrentUser } from '../types/employer.types';

@Controller('employer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY)
export class EmployerAssignmentController {
  constructor(private readonly internshipService: EmployerInternshipService) {}

  @Get('internship-assignment-candidates')
  listCandidates(
    @CurrentUser() user: EmployerCurrentUser,
    @Query() query: AssignmentCandidateQueryDto,
  ) {
    return this.internshipService.listCandidates(user.userAccountId, query);
  }

  @Post('referrals/:referralId/internship-assignment')
  createAssignment(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('referralId', ParseIntPipe) referralId: number,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.internshipService.createAssignment(
      user.userAccountId,
      referralId,
      dto,
    );
  }
}
