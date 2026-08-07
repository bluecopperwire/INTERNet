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

export enum AuthenticationProvider {
  GOOGLE = 'google',
}

@Entity({ name: 'oauth_identity', schema: 'public' })
export class OAuthIdentity {
  @PrimaryGeneratedColumn({ name: 'oauth_identity_id', type: 'integer' })
  oauthIdentityId: number;

  @Column({ name: 'user_account_id', type: 'integer' })
  userAccountId: number;

  @ManyToOne(() => UserAccount, (account) => account.oauthIdentities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_account_id' })
  userAccount: UserAccount;

  @Column({
    name: 'authentication_provider',
    type: 'enum',
    enum: AuthenticationProvider,
  })
  authenticationProvider: AuthenticationProvider;

  @Column({ name: 'provider_subject', type: 'text' })
  providerSubject: string;

  @Column({ name: 'provider_email', type: 'text' })
  providerEmail: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
