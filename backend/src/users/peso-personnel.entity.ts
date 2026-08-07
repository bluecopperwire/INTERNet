import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'peso_personnel', schema: 'public' })
export class PesoPersonnel {
  @PrimaryGeneratedColumn({ name: 'peso_personnel_id', type: 'integer' })
  pesoPersonnelId: number;

  @Column({ name: 'user_account_id', type: 'integer' })
  userAccountId: number;

  @Column({ name: 'employee_id', type: 'text' })
  employeeId: string;

  @Column({ name: 'first_name', type: 'text' })
  firstName: string;

  @Column({ name: 'middle_name', type: 'text', nullable: true })
  middleName: string | null;

  @Column({ name: 'last_name', type: 'text' })
  lastName: string;

  @Column({ name: 'extension_name', type: 'text', nullable: true })
  extensionName: string | null;
}
