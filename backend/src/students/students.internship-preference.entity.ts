import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'public', name: 'internship_preference' })
export class InternshipPreference {
  @PrimaryGeneratedColumn({ name: 'internship_preference_id' })
  internshipPreferenceId: number;

  @Column({ name: 'student_id', type: 'int' })
  studentId: number;

  @Column({ name: 'required_hours', type: 'int' })
  requiredHours: number;

  @Column({ name: 'available_days', type: 'enum', enum: ['weekdays', 'weekends', 'flexible'] })
  availableDays: string;

  @Column({ name: 'allows_outside_preferred_field', type: 'boolean' })
  allowsOutsidePreferredField: boolean;

  @Column({ name: 'start_date', type: 'date' })
  startDate: Date;

  @Column({ name: 'preferred_company_type', type: 'enum', enum: ['government', 'private'] })
  preferredCompanyType: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
