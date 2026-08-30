import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'public', name: 'student_preferred_industry' })
export class StudentPreferredIndustry {
  @PrimaryColumn({ name: 'student_id', type: 'int' })
  studentId: number;

  @PrimaryColumn({ name: 'industry_id', type: 'int' })
  industryId: number;

  @Column({ name: 'custom_industry_name', type: 'text', nullable: true })
  customIndustryName: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
