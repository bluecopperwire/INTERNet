import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { UserRole } from '../../users/entities/account.entities';
import { UpdateEmployerProfileDto } from '../dto';
import type { EmployerCurrentUser } from '../types/employer.types';
import { EmployerProfileService } from '../services/employer-profile.service';

const logoUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (
    _request: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowed = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ]);
    if (!allowed.has(file.mimetype)) {
      callback(
        new UnsupportedMediaTypeException(
          'Company logo must be JPEG, PNG, WebP, or GIF.',
        ),
        false,
      );
      return;
    }
    callback(null, true);
  },
};

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
  @UseInterceptors(FileInterceptor('image', logoUploadOptions))
  replaceLogo(
    @CurrentUser() user: EmployerCurrentUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file)
      throw new BadRequestException('Multipart field "image" is required.');
    return this.profileService.replaceLogo(user.userAccountId, file);
  }
}
