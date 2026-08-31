import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from './entities/account.entities';
import { AccountManagementService } from './account-management.service';
import {
  CreateCompanyAccountDto,
  CreatePesoPersonnelAccountDto,
} from './dto/account-management.dto';
import { UpdatePesoProfileDto } from './dto/peso-profile.dto';
import { profilePictureUploadOptions } from '../storage/profile-picture-upload.config';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly accounts: AccountManagementService) {}

  @Roles(UserRole.ADMIN)
  @Post('companies')
  createCompany(@Body() dto: CreateCompanyAccountDto) {
    return this.accounts.createCompany(dto);
  }

  @Roles(UserRole.ADMIN)
  @Post('peso-personnel')
  createPesoPersonnel(
    @CurrentUser('userAccountId') adminId: number,
    @Body() dto: CreatePesoPersonnelAccountDto,
  ) {
    return this.accounts.createPesoPersonnel(dto, adminId);
  }

  @Roles(UserRole.PESO_PERSONNEL)
  @Get('peso/profile')
  getPesoProfile(@CurrentUser('userAccountId') id: number) {
    return this.accounts.getPesoProfile(id);
  }

  @Roles(UserRole.PESO_PERSONNEL)
  @Patch('peso/profile')
  updatePesoProfile(
    @CurrentUser('userAccountId') id: number,
    @Body() dto: UpdatePesoProfileDto,
  ) {
    return this.accounts.updatePesoProfile(id, dto);
  }

  @Roles(UserRole.PESO_PERSONNEL)
  @Put('peso/profile/image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', profilePictureUploadOptions))
  replacePesoProfilePicture(
    @CurrentUser('userAccountId') id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Multipart field "image" is required.');
    }
    return this.accounts.replacePesoProfilePicture(id, file);
  }
}
