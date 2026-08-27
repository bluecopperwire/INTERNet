import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  AuthenticationProvider,
  AuthenticationSession,
  Company,
  ExternalAuthenticationIdentity,
  LocalAuthenticationCredential,
  PersonnelVerificationStatus,
  PesoPersonnel,
  Student,
  UserAccount,
  UserRole,
} from './entities/account.entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserAccount)
    private readonly accounts: Repository<UserAccount>,
    @InjectRepository(LocalAuthenticationCredential)
    private readonly credentials: Repository<LocalAuthenticationCredential>,
    @InjectRepository(ExternalAuthenticationIdentity)
    private readonly identities: Repository<ExternalAuthenticationIdentity>,
    @InjectRepository(AuthenticationSession)
    private readonly sessions: Repository<AuthenticationSession>,
    @InjectRepository(PesoPersonnel)
    private readonly personnel: Repository<PesoPersonnel>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(Company)
    private readonly companies: Repository<Company>,
  ) {}

  async findByEmail(email: string): Promise<UserAccount | null> {
    await this.accounts.query(
      `UPDATE public.user_account
       SET account_status = 'active', suspended_until = NULL
       WHERE lower(email) = lower($1)
         AND account_status = 'suspended'
         AND suspended_until <= CURRENT_TIMESTAMP`,
      [email.trim()],
    );
    return this.accounts
      .createQueryBuilder('account')
      .where('lower(account.email) = lower(:email)', { email: email.trim() })
      .getOne();
  }

  async findById(userAccountId: number): Promise<UserAccount | null> {
    await this.accounts.query(
      `UPDATE public.user_account
       SET account_status = 'active', suspended_until = NULL
       WHERE user_account_id = $1
         AND account_status = 'suspended'
         AND suspended_until <= CURRENT_TIMESTAMP`,
      [userAccountId],
    );
    return this.accounts.findOne({ where: { userAccountId } });
  }

  findLocalCredential(
    userAccountId: number,
  ): Promise<LocalAuthenticationCredential | null> {
    return this.credentials
      .createQueryBuilder('credential')
      .addSelect('credential.passwordHash')
      .where('credential.userAccountId = :userAccountId', { userAccountId })
      .getOne();
  }

  findGoogleIdentity(
    providerSubject: string,
  ): Promise<ExternalAuthenticationIdentity | null> {
    return this.identities.findOne({
      where: {
        authenticationProvider: AuthenticationProvider.GOOGLE,
        providerSubject,
      },
    });
  }

  findGoogleIdentityForAccount(
    userAccountId: number,
  ): Promise<ExternalAuthenticationIdentity | null> {
    return this.identities.findOne({
      where: {
        userAccountId,
        authenticationProvider: AuthenticationProvider.GOOGLE,
      },
    });
  }

  findSession(tokenFamilyId: string): Promise<AuthenticationSession | null> {
    return this.sessions
      .createQueryBuilder('session')
      .addSelect('session.refreshTokenHash')
      .where('session.tokenFamilyId = :tokenFamilyId', { tokenFamilyId })
      .getOne();
  }

  async getCurrentAccount(userAccountId: number): Promise<{
    account: UserAccount;
    verificationStatus: PersonnelVerificationStatus | null;
    studentId: number | null;
    companyId: number | null;
    pesoPersonnelId: number | null;
  } | null> {
    const account = await this.findById(userAccountId);
    if (!account) return null;
    let verificationStatus: PersonnelVerificationStatus | null = null;
    let studentId: number | null = null;
    let companyId: number | null = null;
    let pesoPersonnelId: number | null = null;

    if (account.userRole === UserRole.PESO_PERSONNEL) {
      const peso = await this.personnel.findOne({ where: { userAccountId } });
      verificationStatus = peso
        ? PersonnelVerificationStatus.APPROVED
        : null;
      pesoPersonnelId = peso?.pesoPersonnelId ?? null;
    } else if (account.userRole === UserRole.STUDENT) {
      const student = await this.students.findOne({ where: { userAccountId } });
      studentId = student?.studentId ?? null;
    } else if (account.userRole === UserRole.COMPANY) {
      const comp = await this.companies.findOne({ where: { userAccountId } });
      companyId = comp?.companyId ?? null;
    }

    return {
      account,
      verificationStatus,
      studentId,
      companyId,
      pesoPersonnelId,
    };
  }

  async revokeSession(tokenFamilyId: string): Promise<void> {
    await this.sessions.update(
      { tokenFamilyId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async revokeAllSessions(userAccountId: number): Promise<void> {
    await this.sessions.update(
      { userAccountId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }
}
