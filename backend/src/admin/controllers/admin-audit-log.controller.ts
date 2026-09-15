import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/account.entities';
import { AdminAuditLogQueryDto } from '../dto/admin-audit-log.dto';
import { AdminAuditLogService } from '../services/admin-audit-log.service';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAuditLogController {
  constructor(private readonly service: AdminAuditLogService) {}

  @Get(':category/export')
  async export(
    @Param('category') category: string,
    @Query() query: AdminAuditLogQueryDto,
    @Res() response: Response,
  ) {
    const csv = await this.service.exportCsv(category, query);
    const safeCategory = category.replaceAll(/[^a-z-]/g, '');
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-logs-${safeCategory}.csv"`,
    );
    response.send(csv);
  }

  @Get(':category')
  list(
    @Param('category') category: string,
    @Query() query: AdminAuditLogQueryDto,
  ) {
    return this.service.list(category, query);
  }
}
