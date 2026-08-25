import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/account.entities';
import {
  AdminListQueryDto,
  CreateAdminEmployerDto,
  UpdateAdminEmployerDto,
} from '../dto/admin-user-management.dto';
import { AdminUserManagementService } from '../services/admin-user-management.service';

@Controller('admin/employers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminEmployerController {
  constructor(private readonly service: AdminUserManagementService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.service.listEmployers(query);
  }

  @Get(':companyId')
  details(@Param('companyId', ParseIntPipe) companyId: number) {
    return this.service.getEmployer(companyId);
  }

  @Post()
  create(@Body() dto: CreateAdminEmployerDto) {
    return this.service.createEmployer(dto);
  }

  @Patch(':companyId')
  update(
    @Param('companyId', ParseIntPipe) companyId: number,
    @Body() dto: UpdateAdminEmployerDto,
  ) {
    return this.service.updateEmployer(companyId, dto);
  }
}
