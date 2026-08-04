import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  STUDENT = 'student',
  ADMIN = 'admin',
  EMPLOYER = 'employer',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Entity('user')
export class User {
  @PrimaryGeneratedColumn({ name: 'userId' })
  userId: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    name: 'account_status',
    default: AccountStatus.ACTIVE,
  })
  accountStatus: AccountStatus;

  @Column({ nullable: true, name: 'hashed_refresh_token', type: 'varchar' })
  hashedRefreshToken: string | null;

  @Column({ nullable: true, name: 'refresh_token_family', type: 'varchar' })
  refreshTokenFamily: string | null;

  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  authProvider: AuthProvider;

  @Column({ nullable: true, unique: true, name: 'google_id', type: 'varchar' })
  googleId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
