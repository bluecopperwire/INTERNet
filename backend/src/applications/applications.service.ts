import { Injectable, Logger } from '@nestjs/common';
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
    try {
      return await this.applicationRepo
        .createQueryBuilder('application')
        .leftJoinAndSelect('application.student', 'student')
        .where('student.student_id = :id', { id: studentId })
        .orderBy('application.updated_at', 'DESC')
        .getMany();
    } catch (error) {
      Logger.error('Error in ApplicationsService.findByStudentId', error as any);
      throw error;
    }
  }

  async findByIdAndStudentId(
    applicationId: number,
    studentId: number,
  ): Promise<Application | null> {
    return this.applicationRepo.findOne({
      where: {
        applicationId,
        student: { studentId },
      },
      relations: { student: true },
    });
  }
}
