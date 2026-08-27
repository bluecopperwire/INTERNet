import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

export enum AuthenticationProvider {
  GOOGLE = 'google',
}

export enum PersonnelVerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity({ schema: 'public', name: 'user_account' })
export class UserAccount {
  @PrimaryGeneratedColumn({ name: 'user_account_id', type: 'integer' })
  userAccountId: number;

  @Column({ name: 'email', type: 'text' })
  email: string;

  @Column({
    name: 'user_role',
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
  })
  userRole: UserRole;

  @Column({
    name: 'account_status',
    type: 'enum',
    enum: AccountStatus,
    enumName: 'account_status_enum',
  })
  accountStatus: AccountStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'suspended_until', type: 'timestamptz', nullable: true })
  suspendedUntil: Date | null;
}

@Entity({ schema: 'public', name: 'local_authentication_credential' })
export class LocalAuthenticationCredential {
  @PrimaryColumn({ name: 'user_account_id', type: 'integer' })
  userAccountId: number;

  @Column({ name: 'password_hash', type: 'text', select: false })
  passwordHash: string;

  @Column({ name: 'password_changed_at', type: 'timestamptz' })
  passwordChangedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity({ schema: 'public', name: 'external_authentication_identity' })
export class ExternalAuthenticationIdentity {
  @PrimaryGeneratedColumn({
    name: 'external_authentication_identity_id',
    type: 'integer',
  })
  externalAuthenticationIdentityId: number;

  @Column({ name: 'user_account_id', type: 'integer' })
  userAccountId: number;

  @Column({
    name: 'authentication_provider',
    type: 'enum',
    enum: AuthenticationProvider,
    enumName: 'authentication_provider_enum',
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

@Entity({ schema: 'public', name: 'authentication_session' })
export class AuthenticationSession {
  @PrimaryGeneratedColumn({
    name: 'authentication_session_id',
    type: 'integer',
  })
  authenticationSessionId: number;

  @Column({ name: 'user_account_id', type: 'integer' })
  userAccountId: number;

  @Column({ name: 'token_family_id', type: 'uuid' })
  tokenFamilyId: string;

  @Column({ name: 'refresh_token_hash', type: 'text', select: false })
  refreshTokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity({ schema: 'public', name: 'registration_onboarding' })
export class RegistrationOnboarding {
  @PrimaryGeneratedColumn({
    name: 'registration_onboarding_id',
    type: 'integer',
  })
  registrationOnboardingId: number;

  @Column({ name: 'onboarding_token_hash', type: 'text', select: false })
  onboardingTokenHash: string;

  @Column({
    name: 'authentication_provider',
    type: 'enum',
    enum: AuthenticationProvider,
    enumName: 'authentication_provider_enum',
  })
  authenticationProvider: AuthenticationProvider;

  @Column({ name: 'provider_subject', type: 'text' })
  providerSubject: string;

  @Column({ name: 'verified_email', type: 'text' })
  verifiedEmail: string;

  @Column({ name: 'first_name', type: 'text', nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'text', nullable: true })
  lastName: string | null;

  @Column({
    name: 'intended_user_role',
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
  })
  intendedUserRole: UserRole;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity({ schema: 'public', name: 'student' })
export class Student {
  @PrimaryGeneratedColumn({ name: 'student_id', type: 'integer' })
  studentId: number;
  @Column({ name: 'user_account_id', type: 'integer' }) userAccountId: number;
  @Column({ name: 'first_name', type: 'text' }) firstName: string;
  @Column({ name: 'middle_name', type: 'text', nullable: true }) middleName:
    string | null;
  @Column({ name: 'last_name', type: 'text' }) lastName: string;
  @Column({ name: 'extension_name', type: 'text', nullable: true })
  extensionName: string | null;
  @Column({ name: 'sex', type: 'text' }) sex: string;
  @Column({ name: 'birth_date', type: 'date' }) birthDate: string;
  @Column({ name: 'contact_number', type: 'text' }) contactNumber: string;
  @Column({ name: 'contact_email', type: 'text' }) contactEmail: string;
  @Column({ name: 'linkedin_url', type: 'text', nullable: true }) linkedinUrl:
    string | null;
  @Column({ name: 'address_line', type: 'text' }) addressLine: string;
  @Column({ name: 'address_barangay', type: 'text' }) addressBarangay: string;
  @Column({ name: 'address_district', type: 'text' }) addressDistrict: string;
  @Column({ name: 'address_city', type: 'text' }) addressCity: string;
  @Column({
    name: 'inquiry_method',
    type: 'enum',
    enum: ['walk_in', 'online', 'phone_call', 'school'],
    enumName: 'inquiry_method_enum',
  })
  inquiryMethod: string;
  @Column({ name: 'photo_file_path', type: 'text', nullable: true })
  photoFilePath: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity({ schema: 'public', name: 'industry' })
export class Industry {
  @PrimaryGeneratedColumn({ name: 'industry_id', type: 'integer' })
  industryId: number;
  @Column({ name: 'industry_name', type: 'text' }) industryName: string;
  @Column({ name: 'is_custom_text', type: 'boolean' }) isCustomText: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity({ schema: 'public', name: 'company' })
export class Company {
  @PrimaryGeneratedColumn({ name: 'company_id', type: 'integer' })
  companyId: number;
  @Column({ name: 'user_account_id', type: 'integer' }) userAccountId: number;
  @Column({ name: 'industry_id', type: 'integer' }) industryId: number;
  @Column({ name: 'company_name', type: 'text' }) companyName: string;
  @Column({
    name: 'company_type',
    type: 'enum',
    enum: ['government', 'private'],
    enumName: 'company_type_enum',
  })
  companyType: string;
  @Column({ name: 'description', type: 'text' }) description: string;
  @Column({ name: 'website_url', type: 'text', nullable: true }) websiteUrl:
    string | null;
  @Column({ name: 'year_established', type: 'smallint', nullable: true })
  yearEstablished: number | null;
  @Column({ name: 'company_size', type: 'integer', nullable: true })
  companySize: number | null;
  @Column({ name: 'contact_email', type: 'text' }) contactEmail: string;
  @Column({ name: 'contact_number', type: 'text' }) contactNumber: string;
  @Column({ name: 'contact_person_first_name', type: 'text' })
  contactPersonFirstName: string;
  @Column({ name: 'contact_person_middle_name', type: 'text', nullable: true })
  contactPersonMiddleName: string | null;
  @Column({ name: 'contact_person_last_name', type: 'text' })
  contactPersonLastName: string;
  @Column({
    name: 'contact_person_extension_name',
    type: 'text',
    nullable: true,
  })
  contactPersonExtensionName: string | null;
  @Column({ name: 'address_line', type: 'text' }) addressLine: string;
  @Column({ name: 'address_barangay', type: 'text' }) addressBarangay: string;
  @Column({ name: 'address_district', type: 'text', nullable: true })
  addressDistrict: string | null;
  @Column({ name: 'address_city', type: 'text' }) addressCity: string;
  @Column({ name: 'logo_file_path', type: 'text', nullable: true })
  logoFilePath: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity({ schema: 'public', name: 'peso_personnel' })
export class PesoPersonnel {
  @PrimaryGeneratedColumn({ name: 'peso_personnel_id', type: 'integer' })
  pesoPersonnelId: number;
  @Column({ name: 'user_account_id', type: 'integer' }) userAccountId: number;
  @Column({ name: 'first_name', type: 'text' }) firstName: string;
  @Column({ name: 'middle_name', type: 'text', nullable: true }) middleName:
    string | null;
  @Column({ name: 'last_name', type: 'text' }) lastName: string;
  @Column({ name: 'extension_name', type: 'text', nullable: true })
  extensionName: string | null;
  @Column({ name: 'sex', type: 'text' }) sex: string;
  @Column({ name: 'birth_date', type: 'date' }) birthDate: string;
  @Column({ name: 'address_line', type: 'text' }) addressLine: string;
  @Column({ name: 'address_barangay', type: 'text' }) addressBarangay: string;
  @Column({ name: 'address_district', type: 'text' }) addressDistrict: string;
  @Column({ name: 'address_city', type: 'text' }) addressCity: string;
  @Column({ name: 'contact_number', type: 'text' }) contactNumber: string;
  @Column({ name: 'contact_email', type: 'text' }) contactEmail: string;
  @Column({ name: 'employee_id', type: 'text' }) employeeId: string;
  @Column({ name: 'position', type: 'text' }) position: string;
  @Column({ name: 'department', type: 'text' }) department: string;
  @Column({ name: 'photo_file_path', type: 'text', nullable: true })
  photoFilePath: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

export const AUTH_REGISTRATION_ENTITIES = [
  UserAccount,
  LocalAuthenticationCredential,
  ExternalAuthenticationIdentity,
  AuthenticationSession,
  RegistrationOnboarding,
  Student,
  Company,
  PesoPersonnel,
  Industry,
] as const;
