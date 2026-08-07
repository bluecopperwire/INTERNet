import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserAccount } from './user-account.entity';

export enum InquiryMethod {
  WALK_IN = 'walk_in',
  ONLINE = 'online',
  PHONE_CALL = 'phone_call',
  SCHOOL = 'school',
}

@Entity({ name: 'student', schema: 'public' })
export class Student {
  @PrimaryGeneratedColumn({ name: 'student_id', type: 'integer' })
  studentId: number;

  @Column({ name: 'user_account_id', type: 'integer' })
  userAccountId: number;

  @OneToOne(() => UserAccount)
  @JoinColumn({ name: 'user_account_id' })
  userAccount: UserAccount;

  @Column({ name: 'first_name', type: 'text' })
  firstName: string;

  @Column({ name: 'middle_name', type: 'text', nullable: true })
  middleName: string | null;

  @Column({ name: 'last_name', type: 'text' })
  lastName: string;

  @Column({ name: 'extension_name', type: 'text', nullable: true })
  extensionName: string | null;

  @Column({ type: 'text' })
  sex: string;

  @Column({ name: 'birth_date', type: 'date' })
  birthDate: string;

  @Column({ name: 'contact_number', type: 'text' })
  contactNumber: string;

  @Column({ name: 'contact_email', type: 'text' })
  contactEmail: string;

  @Column({ name: 'linkedin_url', type: 'text', nullable: true })
  linkedinUrl: string | null;

  @Column({ name: 'address_line', type: 'text' })
  addressLine: string;

  @Column({ name: 'address_barangay', type: 'text' })
  addressBarangay: string;

  @Column({ name: 'address_district', type: 'text' })
  addressDistrict: string;

  @Column({ name: 'address_city', type: 'text' })
  addressCity: string;

  @Column({ name: 'inquiry_method', type: 'enum', enum: InquiryMethod })
  inquiryMethod: InquiryMethod;

  @Column({ name: 'photo_file_path', type: 'text', nullable: true })
  photoFilePath: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
