import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/account.entities';
import { InternshipListQueryDto, UpdateAssignmentDto } from '../dto';
import { EmployerInternshipService } from '../services/employer-internship.service';
import type { EmployerCurrentUser } from '../types/employer.types';

@Controller('employer/internships')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY)
export class EmployerInternshipController {
  constructor(private readonly internshipService: EmployerInternshipService) {}

  @Get('summary')
  summary(@CurrentUser() user: EmployerCurrentUser) {
    return this.internshipService.summary(user.userAccountId);
  }

  @Get()
  list(
    @CurrentUser() user: EmployerCurrentUser,
    @Query() query: InternshipListQueryDto,
  ) {
    return this.internshipService.list(user.userAccountId, query);
  }

  @Get(':internshipAssignmentId')
  getById(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('internshipAssignmentId', ParseIntPipe)
    internshipAssignmentId: number,
  ) {
    return this.internshipService.getById(
      user.userAccountId,
      internshipAssignmentId,
    );
  }

  @Patch(':internshipAssignmentId')
  update(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('internshipAssignmentId', ParseIntPipe)
    internshipAssignmentId: number,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.internshipService.update(
      user.userAccountId,
      internshipAssignmentId,
      dto,
    );
  }

  @Patch(':internshipAssignmentId/cancel')
  cancel(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('internshipAssignmentId', ParseIntPipe)
    internshipAssignmentId: number,
  ) {
    return this.internshipService.cancel(
      user.userAccountId,
      internshipAssignmentId,
    );
  }

  @Patch(':internshipAssignmentId/complete')
  complete(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('internshipAssignmentId', ParseIntPipe)
    internshipAssignmentId: number,
  ) {
    return this.internshipService.complete(
      user.userAccountId,
      internshipAssignmentId,
    );
  }

  @Delete(':internshipAssignmentId')
  softDelete(
    @CurrentUser() user: EmployerCurrentUser,
    @Param('internshipAssignmentId', ParseIntPipe)
    internshipAssignmentId: number,
  ) {
    return this.internshipService.softDelete(
      user.userAccountId,
      internshipAssignmentId,
    );
  }
}
