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
  CreateAdminPesoPersonnelDto,
  UpdateAdminPesoPersonnelDto,
} from '../dto/admin-user-management.dto';
import { AdminUserManagementService } from '../services/admin-user-management.service';

@Controller('admin/qc-peso')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminQcPesoController {
  constructor(private readonly service: AdminUserManagementService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.service.listPesoPersonnel(query);
  }

  @Get(':pesoPersonnelId')
  details(@Param('pesoPersonnelId', ParseIntPipe) pesoPersonnelId: number) {
    return this.service.getPesoPersonnel(pesoPersonnelId);
  }

  @Post()
  create(@Body() dto: CreateAdminPesoPersonnelDto) {
    return this.service.createPesoPersonnel(dto);
  }

  @Patch(':pesoPersonnelId')
  update(
    @Param('pesoPersonnelId', ParseIntPipe) pesoPersonnelId: number,
    @Body() dto: UpdateAdminPesoPersonnelDto,
  ) {
    return this.service.updatePesoPersonnel(pesoPersonnelId, dto);
  }
}
