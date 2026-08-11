import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Student } from './students.entity';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [TypeOrmModule.forFeature([Student]), ApplicationsModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
