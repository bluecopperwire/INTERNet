import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from './application.entity';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
  ) {}

  async findByStudentId(studentId: number): Promise<Application[]> {
    return this.applicationRepo
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.student', 'student')
      .where('student.studentId = :id', { id: studentId })
      .orderBy('application.created_at', 'DESC')
      .getMany();
  }
}
