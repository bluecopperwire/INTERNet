import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Student } from '../students/students.entity';
import { ApplicationStatus } from '../common/enums/application-status.enum';
import { StudentResponse } from '../common/enums/student-response.enum';

@Entity('application')
export class Application {
  @PrimaryGeneratedColumn({ name: 'application_id' })
  applicationId: number;

  @ManyToOne(() => Student, student => student.applications)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  // @ManyToOne(() => Opportunity, opportunity => opportunity.applications)
  // @JoinColumn({ name: 'opportunity_id' }) 
  // opportunity: Opportunity;

  @Column({
    name: 'submitted_at',
    type: 'timestamp'
  })
  submittedAt: Date

  @Column({
    name:'application_status',
    type: 'enum',
    enum: ApplicationStatus
  })
  applicationStatus: ApplicationStatus;

  @Column({
    name: 'remark',
    type: 'text'
  })
  remark!: string
  
  @Column({
    name: 'student_response',
    type: 'enum',
    enum: StudentResponse
  })
  studentResponse: StudentResponse

  @Column({
    name: 'student_responded_at',
    type: 'timestamp'
  })
  studentRespondedAt!: Date

  @Column({
    name: 'updated_at',
    type: 'timestamp'
  })
  updatedAt: Date
}
