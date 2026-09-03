import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'public', name: 'attendance_record' })
export class AttendanceRecord {
  @PrimaryGeneratedColumn({ name: 'attendance_record_id' })
  attendanceRecordId: number;

  @Column({ name: 'internship_assignment_id', type: 'int' })
  internshipAssignmentId: number;

  @Column({ name: 'attendance_date', type: 'date' })
  attendanceDate: Date;

  @Column({
    name: 'attendance_status',
    type: 'enum',
    enum: ['present', 'absent', 'incomplete'],
  })
  attendanceStatus: 'present' | 'absent' | 'incomplete';

  @Column({ name: 'time_in', type: 'time', nullable: true })
  timeIn: string | null;

  @Column({ name: 'time_out', type: 'time', nullable: true })
  timeOut: string | null;

  @Column({ name: 'rendered_minutes', type: 'int', default: 0 })
  renderedMinutes: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
