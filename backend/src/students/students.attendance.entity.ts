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

  @Column({ name: 'time_in', type: 'time' })
  timeIn: string;

  @Column({ name: 'time_in_status', type: 'enum', enum: ['on_time', 'late'] })
  timeInStatus: string;

  @Column({ name: 'time_out', type: 'time', nullable: true })
  timeOut: string | null;

  @Column({ name: 'hours_rendered', type: 'numeric', nullable: true })
  hoursRendered: number | null;

  @Column({ name: 'rendered_hours_status', type: 'enum', enum: ['complete', 'undertime', 'overtime', 'incomplete'], default: 'incomplete' })
  renderedHoursStatus: string;

  @Column({ name: 'photo_file_path', type: 'text', nullable: true })
  photoFilePath: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
