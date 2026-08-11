import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Application } from '../applications/application.entity';
import { InquiryMethod } from '../common/enums/student-inquiry-method.enum';

@Entity('student')
export class Student {
  @PrimaryGeneratedColumn({ name: 'student_id' })
  studentId: number;

  @Column({
    name: 'user_account_id',
    type: 'int', 
  })
  userAccountId: number;

  @Column({
    name: 'first_name',
    type: 'text',
  })
  firstName: string;

  @Column({
    name: 'last_name',
    type: 'text',
  })
  lastName: string;


  @Column({
    name: 'extension_name',
    type: 'text',
  })
  extensionName: string;

  @Column({
    name: 'sex',
    type: 'text',
  })
  sex: string;

  @CreateDateColumn({
    name: 'birth_date'
  })
  birthDate: Date;

  @Column({
    name: 'contact_number',
    type: 'text',
  })
  contactNumber: string;

  @Column({
    name: 'contact_email',
    type: 'text',
  })
  contactEmail: string;

  @Column({
    name: 'linkedin_url',
    type: 'text',
  })
  linkedinUrl: string;

  @Column({
    name: 'address_line',
    type: 'text',
  })
  addressLine: string;

  @Column({
    name: 'address_barangay',
    type: 'text',
  })
  addressBarangay: string;

  @Column({
    name: 'address_district',
    type: 'text',
  })
  addressDistrict: string;
  
  @Column({
    name: 'address_city',
    type: 'text',
  })
  addressCity: string;

  @Column({
    name: 'inquiry_method',
    type: 'enum',
    enum: InquiryMethod
  })
  inquiryMethod: InquiryMethod;

  @Column({
    name: 'photo_file_path',
    type: 'text',
  })
  photoFilePath: string;
  
  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
  
  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  @OneToMany(() => Application, application => application.student)
  applications: Application[];
}
