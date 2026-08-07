import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AUTH_REGISTRATION_ENTITIES } from './entities/account.entities';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AccountManagementService } from './account-management.service';

@Module({
  imports: [TypeOrmModule.forFeature([...AUTH_REGISTRATION_ENTITIES])],
  controllers: [UsersController],
  providers: [UsersService, AccountManagementService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
