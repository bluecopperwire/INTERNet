import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'company', schema: 'public' })
export class Company {
  @PrimaryGeneratedColumn({ name: 'company_id', type: 'integer' })
  companyId: number;

  @Column({ name: 'user_account_id', type: 'integer' })
  userAccountId: number;

  @Column({ name: 'company_name', type: 'text' })
  companyName: string;

  @Column({ name: 'logo_file_path', type: 'text' })
  logoFilePath: string;
}
