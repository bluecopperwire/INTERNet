import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserAccount } from '../../users/user-account.entity';

@Entity({ name: 'auth_session', schema: 'public' })
export class AuthSession {
  @PrimaryGeneratedColumn({ name: 'auth_session_id', type: 'integer' })
  authSessionId: number;

  @Column({ name: 'user_account_id', type: 'integer' })
  userAccountId: number;

  @ManyToOne(() => UserAccount, (account) => account.authSessions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_account_id' })
  userAccount: UserAccount;

  @Column({ name: 'refresh_token_hash', type: 'text' })
  refreshTokenHash: string;

  @Column({ name: 'token_family_id', type: 'uuid' })
  tokenFamilyId: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
