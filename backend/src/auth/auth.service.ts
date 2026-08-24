import { randomBytes, randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager } from 'typeorm';
import { UsersService } from '../users/users.service';
import {
  AccountStatus,
  AuthenticationProvider,
  AuthenticationSession,
  ExternalAuthenticationIdentity,
  LocalAuthenticationCredential,
  PersonnelVerificationStatus,
  PesoPersonnel,
  RegistrationOnboarding,
  Student,
  UserAccount,
  UserRole,
} from '../users/entities/account.entities';
import {
  GoogleStudentCompletionDto,
  PesoRegistrationDto,
  SignupDto,
  StudentProfileDto,
} from './dto/signup.dto';
import { StorageService } from '../storage/private-file-storage';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleProfile {
  providerSubject: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
}

function expiryDate(value: string | undefined, fallbackMs: number): Date {
  if (!value) return new Date(Date.now() + fallbackMs);
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return new Date(Date.now() + fallbackMs);
  const factors = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(
    Date.now() + Number(match[1]) * factors[match[2] as keyof typeof factors],
  );
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  private required(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) throw new Error(`${name} is required`);
    return value;
  }

  getCookieOptions(path = '/auth'): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
    maxAge: number;
    domain?: string;
  } {
    const domain = this.config.get<string>('COOKIE_DOMAIN');
    return {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: (this.config.get<string>('COOKIE_SAMESITE') ?? 'lax') as
        'strict' | 'lax' | 'none',
      path,
      maxAge:
        expiryDate(
          this.config.get<string>('JWT_REFRESH_EXPIRES'),
          7 * 86_400_000,
        ).getTime() - Date.now(),
      ...(domain && domain !== 'localhost' ? { domain } : {}),
    };
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserAccount | null> {
    const account = await this.users.findByEmail(email);
    if (
      !account ||
      account.accountStatus !== AccountStatus.ACTIVE ||
      account.deletedAt
    )
      return null;
    const credential = await this.users.findLocalCredential(
      account.userAccountId,
    );
    if (
      !credential ||
      !(await bcrypt.compare(password, credential.passwordHash))
    )
      return null;
    return account;
  }

  async login(account: UserAccount): Promise<Tokens> {
    if (account.accountStatus !== AccountStatus.ACTIVE || account.deletedAt) {
      throw new UnauthorizedException('Account is not active');
    }
    return this.dataSource.transaction((manager) =>
      this.createSession(manager, account),
    );
  }

  async refreshTokens(
    userAccountId: number,
    tokenFamilyId: string,
    refreshToken: string,
  ): Promise<Tokens> {
    const current = await this.users.getCurrentAccount(userAccountId);
    if (
      !current ||
      current.account.accountStatus !== AccountStatus.ACTIVE ||
      current.account.deletedAt
    ) {
      throw new UnauthorizedException('Account is not active');
    }
    const session = await this.users.findSession(tokenFamilyId);
    if (
      !session ||
      session.userAccountId !== userAccountId ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Session is unavailable');
    }
    if (!(await bcrypt.compare(refreshToken, session.refreshTokenHash))) {
      await this.users.revokeSession(tokenFamilyId);
      throw new UnauthorizedException(
        'Refresh token reuse detected; this session family was revoked',
      );
    }
    const tokens = await this.signTokens(current.account, tokenFamilyId);
    await this.dataSource.getRepository(AuthenticationSession).update(
      { authenticationSessionId: session.authenticationSessionId },
      {
        refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 10),
        lastUsedAt: new Date(),
      },
    );
    return tokens;
  }

  logout(tokenFamilyId: string): Promise<void> {
    return this.users.revokeSession(tokenFamilyId);
  }

  logoutAll(userAccountId: number): Promise<void> {
    return this.users.revokeAllSessions(userAccountId);
  }

  async registerStudent(dto: SignupDto): Promise<Tokens> {
    await this.ensureEmailAvailable(dto.email);
    return this.dataSource.transaction(async (manager) => {
      const account = await manager.save(
        UserAccount,
        manager.create(UserAccount, {
          email: dto.email.trim().toLowerCase(),
          userRole: UserRole.STUDENT,
          accountStatus: AccountStatus.ACTIVE,
          deletedAt: null,
        }),
      );
      await manager.save(
        LocalAuthenticationCredential,
        manager.create(LocalAuthenticationCredential, {
          userAccountId: account.userAccountId,
          passwordHash: await bcrypt.hash(dto.password, 10),
          passwordChangedAt: new Date(),
        }),
      );
      await manager.save(Student, this.studentEntity(manager, account, dto));
      return this.createSession(manager, account);
    });
  }

  async registerPeso(dto: PesoRegistrationDto): Promise<Tokens> {
    await this.ensureEmailAvailable(dto.email);
    const fileKey = await this.storage.storeEmployeeId({
      data: Buffer.from(dto.employeeIdFileBase64, 'base64'),
      mimeType: dto.employeeIdFileMimeType,
      originalName: dto.employeeIdFileName,
    });
    try {
      return await this.dataSource.transaction(async (manager) => {
        const account = await manager.save(
          UserAccount,
          manager.create(UserAccount, {
            email: dto.email.trim().toLowerCase(),
            userRole: UserRole.PESO_PERSONNEL,
            accountStatus: AccountStatus.ACTIVE,
            deletedAt: null,
          }),
        );
        await manager.save(
          LocalAuthenticationCredential,
          manager.create(LocalAuthenticationCredential, {
            userAccountId: account.userAccountId,
            passwordHash: await bcrypt.hash(dto.password, 10),
            passwordChangedAt: new Date(),
          }),
        );
        await manager.save(
          PesoPersonnel,
          manager.create(PesoPersonnel, {
            userAccountId: account.userAccountId,
            firstName: dto.firstName,
            middleName: dto.middleName ?? null,
            lastName: dto.lastName,
            extensionName: dto.extensionName ?? null,
            sex: dto.sex,
            birthDate: dto.birthDate,
            addressLine: dto.addressLine,
            addressBarangay: dto.addressBarangay,
            addressDistrict: dto.addressDistrict,
            addressCity: dto.addressCity,
            contactNumber: dto.contactNumber,
            contactEmail: account.email,
            employeeId: dto.employeeId,
            position: dto.position,
            department: dto.department,
            employeeIdFilePath: fileKey,
            photoFilePath: dto.photoFilePath ?? null,
            verificationStatus: PersonnelVerificationStatus.PENDING,
            reviewedAt: null,
            reviewedByUserAccountId: null,
            verificationRemark: null,
          }),
        );
        return this.createSession(manager, account);
      });
    } catch (error) {
      await this.storage.delete(fileKey);
      throw error;
    }
  }

  async beginGoogleSignup(
    profile: GoogleProfile,
  ): Promise<{ onboardingToken: string }> {
    this.assertVerifiedGoogle(profile);
    if (await this.users.findGoogleIdentity(profile.providerSubject)) {
      throw new ConflictException('account-already-exists');
    }
    if (await this.users.findByEmail(profile.email)) {
      throw new ConflictException(
        'matching-email-account-requires-explicit-linking',
      );
    }
    const rawSecret = randomBytes(32).toString('base64url');
    const repository = this.dataSource.getRepository(RegistrationOnboarding);
    let row = await repository.findOne({
      where: {
        authenticationProvider: AuthenticationProvider.GOOGLE,
        providerSubject: profile.providerSubject,
      },
    });
    const values = {
      onboardingTokenHash: await bcrypt.hash(rawSecret, 10),
      authenticationProvider: AuthenticationProvider.GOOGLE,
      providerSubject: profile.providerSubject,
      verifiedEmail: profile.email.toLowerCase(),
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      intendedUserRole: UserRole.STUDENT,
      expiresAt: new Date(Date.now() + 30 * 60_000),
      consumedAt: null,
    };
    row = await repository.save(
      row ? repository.merge(row, values) : repository.create(values),
    );
    return { onboardingToken: `${row.registrationOnboardingId}.${rawSecret}` };
  }

  async completeGoogleStudent(
    rawToken: string,
    dto: GoogleStudentCompletionDto,
  ): Promise<Tokens> {
    const [idText, secret] = rawToken.split('.', 2);
    const id = Number(idText);
    if (!id || !secret)
      throw new UnauthorizedException('Invalid onboarding state');
    return this.dataSource.transaction(async (manager) => {
      const row = await manager
        .getRepository(RegistrationOnboarding)
        .createQueryBuilder('onboarding')
        .addSelect('onboarding.onboardingTokenHash')
        .setLock('pessimistic_write')
        .where('onboarding.registrationOnboardingId = :id', { id })
        .getOne();
      if (
        !row ||
        row.consumedAt ||
        row.expiresAt <= new Date() ||
        !(await bcrypt.compare(secret, row.onboardingTokenHash))
      ) {
        throw new UnauthorizedException(
          'Onboarding is expired, consumed, or invalid',
        );
      }
      await this.ensureEmailAvailable(row.verifiedEmail, manager);
      const account = await manager.save(
        UserAccount,
        manager.create(UserAccount, {
          email: row.verifiedEmail,
          userRole: UserRole.STUDENT,
          accountStatus: AccountStatus.ACTIVE,
          deletedAt: null,
        }),
      );
      await manager.save(
        ExternalAuthenticationIdentity,
        manager.create(ExternalAuthenticationIdentity, {
          userAccountId: account.userAccountId,
          authenticationProvider: AuthenticationProvider.GOOGLE,
          providerSubject: row.providerSubject,
          providerEmail: row.verifiedEmail,
        }),
      );
      await manager.save(Student, this.studentEntity(manager, account, dto));
      row.consumedAt = new Date();
      await manager.save(row);
      return this.createSession(manager, account);
    });
  }

  async googleLogin(profile: GoogleProfile): Promise<Tokens> {
    this.assertVerifiedGoogle(profile);
    const identity = await this.users.findGoogleIdentity(
      profile.providerSubject,
    );
    if (!identity) throw new NotFoundException('account-not-found');
    const account = await this.users.findById(identity.userAccountId);
    if (!account || account.userRole !== UserRole.STUDENT)
      throw new UnauthorizedException('Google login is student-only');
    return this.login(account);
  }

  async linkGoogle(
    userAccountId: number,
    password: string,
    profile: GoogleProfile,
  ): Promise<void> {
    await this.verifyLocalReauthentication(userAccountId, password);
    await this.linkGoogleAfterReauthentication(userAccountId, profile);
  }

  async verifyLocalReauthentication(
    userAccountId: number,
    password: string,
  ): Promise<void> {
    const account = await this.users.findById(userAccountId);
    if (
      !account ||
      account.userRole !== UserRole.STUDENT ||
      account.accountStatus !== AccountStatus.ACTIVE
    ) {
      throw new ForbiddenException('Only an active student may link Google');
    }
    const credential = await this.users.findLocalCredential(userAccountId);
    if (
      !credential ||
      !(await bcrypt.compare(password, credential.passwordHash))
    ) {
      throw new UnauthorizedException('Local re-authentication failed');
    }
  }

  async linkGoogleAfterReauthentication(
    userAccountId: number,
    profile: GoogleProfile,
  ): Promise<void> {
    this.assertVerifiedGoogle(profile);
    const account = await this.users.findById(userAccountId);
    if (
      !account ||
      account.userRole !== UserRole.STUDENT ||
      account.accountStatus !== AccountStatus.ACTIVE
    ) {
      throw new ForbiddenException('Only an active student may link Google');
    }
    if (account.email.toLowerCase() !== profile.email.toLowerCase()) {
      throw new ConflictException(
        'Verified Google email must match the login email',
      );
    }
    const existing = await this.users.findGoogleIdentity(
      profile.providerSubject,
    );
    if (existing && existing.userAccountId !== userAccountId)
      throw new ConflictException('Google identity is already linked');
    await this.dataSource.getRepository(ExternalAuthenticationIdentity).save({
      userAccountId,
      authenticationProvider: AuthenticationProvider.GOOGLE,
      providerSubject: profile.providerSubject,
      providerEmail: profile.email.toLowerCase(),
    });
  }

  async unlinkGoogle(userAccountId: number): Promise<void> {
    if (!(await this.users.findLocalCredential(userAccountId))) {
      throw new ConflictException(
        'Set a local password before unlinking the only authentication method',
      );
    }
    await this.dataSource.getRepository(ExternalAuthenticationIdentity).delete({
      userAccountId,
      authenticationProvider: AuthenticationProvider.GOOGLE,
    });
  }

  async setLocalPassword(
    userAccountId: number,
    password: string,
  ): Promise<void> {
    if (await this.users.findLocalCredential(userAccountId))
      throw new ConflictException('Local password already exists');
    await this.dataSource.getRepository(LocalAuthenticationCredential).save({
      userAccountId,
      passwordHash: await bcrypt.hash(password, 10),
      passwordChangedAt: new Date(),
    });
  }

  async changeLocalPassword(
    userAccountId: number,
    currentPassword: string,
    password: string,
  ): Promise<void> {
    const credential = await this.users.findLocalCredential(userAccountId);
    if (
      !credential ||
      !(await bcrypt.compare(currentPassword, credential.passwordHash))
    ) {
      throw new UnauthorizedException('Current password is invalid');
    }
    await this.dataSource.getRepository(LocalAuthenticationCredential).update(
      { userAccountId },
      {
        passwordHash: await bcrypt.hash(password, 10),
        passwordChangedAt: new Date(),
      },
    );
  }

  async removeLocalPassword(userAccountId: number): Promise<void> {
    if (!(await this.users.findGoogleIdentityForAccount(userAccountId))) {
      throw new ConflictException(
        'Google must remain linked before removing the local password',
      );
    }
    await this.dataSource
      .getRepository(LocalAuthenticationCredential)
      .delete({ userAccountId });
  }

  private async createSession(
    manager: EntityManager,
    account: UserAccount,
  ): Promise<Tokens> {
    const family = randomUUID();
    const tokens = await this.signTokens(account, family);
    await manager.save(
      AuthenticationSession,
      manager.create(AuthenticationSession, {
        userAccountId: account.userAccountId,
        tokenFamilyId: family,
        refreshTokenHash: await bcrypt.hash(tokens.refreshToken, 10),
        expiresAt: expiryDate(
          this.config.get<string>('JWT_REFRESH_EXPIRES'),
          7 * 86_400_000,
        ),
        lastUsedAt: null,
        revokedAt: null,
      }),
    );
    return tokens;
  }

  private async signTokens(
    account: UserAccount,
    family: string,
  ): Promise<Tokens> {
    const accessPayload = {
      sub: account.userAccountId,
      role: account.userRole,
      family,
      type: 'access',
    };
    const refreshPayload = {
      sub: account.userAccountId,
      family,
      jti: randomUUID(),
      type: 'refresh',
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.required('JWT_ACCESS_SECRET'),
        expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES') ??
          '15m') as never,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.required('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES') ??
          '7d') as never,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private studentEntity(
    manager: EntityManager,
    account: UserAccount,
    dto: StudentProfileDto,
  ): Student {
    return manager.create(Student, {
      userAccountId: account.userAccountId,
      firstName: dto.firstName,
      middleName: dto.middleName ?? null,
      lastName: dto.lastName,
      extensionName: dto.extensionName ?? null,
      sex: dto.sex,
      birthDate: dto.birthDate,
      contactNumber: dto.contactNumber,
      contactEmail: account.email,
      linkedinUrl: dto.linkedinUrl ?? null,
      addressLine: dto.addressLine,
      addressBarangay: dto.addressBarangay,
      addressDistrict: dto.addressDistrict,
      addressCity: dto.addressCity,
      inquiryMethod: dto.inquiryMethod,
      photoFilePath: dto.photoFilePath ?? null,
    });
  }

  private async ensureEmailAvailable(
    email: string,
    manager?: EntityManager,
  ): Promise<void> {
    const existing = manager
      ? await manager
          .getRepository(UserAccount)
          .createQueryBuilder('account')
          .where('lower(account.email)=lower(:email)', { email: email.trim() })
          .getOne()
      : await this.users.findByEmail(email);
    if (existing) throw new ConflictException('Email already in use');
  }

  private assertVerifiedGoogle(profile: GoogleProfile): void {
    if (!profile.providerSubject || !profile.email || !profile.emailVerified) {
      throw new UnauthorizedException(
        'Google identity must include a verified email and stable subject',
      );
    }
  }
}
