import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'public', name: 'student_requirement_submission' })
export class StudentRequirementSubmission {
  @PrimaryGeneratedColumn({ name: 'student_requirement_submission_id' })
  studentRequirementSubmissionId: number;

  @Column({ name: 'requirement_type_id', type: 'int' })
  requirementTypeId: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId: number;

  @Column({ name: 'requirement_name', type: 'text' })
  requirementName: string;

  @Column({ name: 'requirement_file_path', type: 'text' })
  requirementFilePath: string;

  @CreateDateColumn({ name: 'submitted_at', type: 'timestamptz' })
  submittedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
