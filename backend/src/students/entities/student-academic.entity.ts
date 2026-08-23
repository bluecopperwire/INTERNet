import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { YearLevel } from '../../common/enums/year-level.enum';

@Entity({ schema: 'public', name: 'student_academic_information' })
export class StudentAcademicInformation {
  @PrimaryGeneratedColumn({ name: 'student_academic_information_id' })
  studentAcademicInformationId: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId: number;

  @Column({ name: 'school_name', type: 'text' })
  schoolName: string;

  @Column({ name: 'year_level', type: 'enum', enum: YearLevel })
  yearLevel: YearLevel;

  @Column({ name: 'strand_program', type: 'text' })
  strandProgram: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
