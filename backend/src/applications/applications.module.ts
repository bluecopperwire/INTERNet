import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from './application.entity';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { OpportunityCatalogController } from './opportunity-catalog.controller';
import { OpportunityCatalogService } from './opportunity-catalog.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Application]), UsersModule],
  controllers: [ApplicationsController, OpportunityCatalogController],
  providers: [ApplicationsService, OpportunityCatalogService],
  exports: [ApplicationsService, OpportunityCatalogService],
})
export class ApplicationsModule {}
