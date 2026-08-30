import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/account.entities';
import {
  AdminListQueryDto,
  UpdateAdminStudentDto,
} from '../dto/admin-user-management.dto';
import { AdminUserManagementService } from '../services/admin-user-management.service';

@Controller('admin/students')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminStudentController {
  constructor(private readonly service: AdminUserManagementService) {}

  @Get()
  list(@Query() query: AdminListQueryDto) {
    return this.service.listStudents(query);
  }

  @Get(':studentId')
  details(@Param('studentId', ParseIntPipe) studentId: number) {
    return this.service.getStudent(studentId);
  }

  @Patch(':studentId')
  update(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() dto: UpdateAdminStudentDto,
  ) {
    return this.service.updateStudent(studentId, dto);
  }
}
