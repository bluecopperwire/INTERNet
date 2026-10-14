import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/account.entities';
import { UpdateEmployerProfileDto } from '../dto';
import type { EmployerCurrentUser } from '../types/employer.types';
import { EmployerProfileService } from '../services/employer-profile.service';
import { profilePictureUploadOptions } from '../../storage/profile-picture-upload.config';

@Controller('employer/profile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY)
export class EmployerProfileController {
  constructor(private readonly profileService: EmployerProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: EmployerCurrentUser) {
    return this.profileService.getProfile(user.userAccountId);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: EmployerCurrentUser,
    @Body() dto: UpdateEmployerProfileDto,
  ) {
    return this.profileService.updateProfile(user.userAccountId, dto);
  }

  @Put('image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', profilePictureUploadOptions))
  replaceLogo(
    @CurrentUser() user: EmployerCurrentUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file)
      throw new BadRequestException('Multipart field "image" is required.');
    return this.profileService.replaceLogo(user.userAccountId, file);
  }
}
