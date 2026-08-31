import { Module } from '@nestjs/common';
import { ProfilePictureStorageService } from './profile-picture-storage.service';

@Module({
  providers: [ProfilePictureStorageService],
  exports: [ProfilePictureStorageService],
})
export class ProfilePictureStorageModule {}
