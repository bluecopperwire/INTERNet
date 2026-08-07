import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuthSession } from '../auth/entities/auth-session.entity';
import { OAuthIdentity } from '../auth/entities/oauth-identity.entity';

export enum UserRole {
  STUDENT = 'student',
  COMPANY = 'company',
  PESO_PERSONNEL = 'peso_personnel',
  ADMIN = 'admin',
}

export enum AccountStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

@Entity({ name: 'user_account', schema: 'public' })
export class UserAccount {
  @PrimaryGeneratedColumn({ name: 'user_account_id', type: 'integer' })
  userAccountId: number;

  @Column({ type: 'text' })
  email: string;

  @Column({
    name: 'password_hash',
    type: 'text',
    nullable: true,
    select: false,
  })
  passwordHash: string | null;

  @Column({ name: 'user_role', type: 'enum', enum: UserRole })
  userRole: UserRole;

  @Column({
    name: 'account_status',
    type: 'enum',
    enum: AccountStatus,
    default: AccountStatus.ACTIVE,
  })
  accountStatus: AccountStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => OAuthIdentity, (identity) => identity.userAccount)
  oauthIdentities: OAuthIdentity[];

  @OneToMany(() => AuthSession, (session) => session.userAccount)
  authSessions: AuthSession[];
}
