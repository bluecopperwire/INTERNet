import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import {
  AccountStatus,
  UserAccount,
  UserRole,
} from '../users/user-account.entity';
import { Student } from '../users/student.entity';
import { UsersService } from '../users/users.service';
import { GoogleCompleteSignupDto } from './dto/google-complete-signup.dto';
import { SignupDto } from './dto/signup.dto';
import { StudentProfileDto } from './dto/student-profile.dto';
import { AuthSession } from './entities/auth-session.entity';
import {
  AuthenticationProvider,
  OAuthIdentity,
} from './entities/oauth-identity.entity';
import { hashPassword, verifyPassword } from './password-hashing';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleIdentityClaims {
  providerSubject: string;
  email: string;
  emailVerified: boolean;
}

export type GoogleAuthenticationResult =
  | ({ requiresProfileCompletion: false } & Tokens)
  | {
      requiresProfileCompletion: true;
      pendingRegistrationToken: string;
      email: string;
    };

interface PendingGoogleRegistrationPayload {
  type: 'google_pending_registration';
  sub: string;
  email: string;
}

interface RefreshPayload {
  sub: number;
  email: string;
  role: UserRole;
  fid: string;
  jti: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(OAuthIdentity)
    private readonly oauthIdentityRepository: Repository<OAuthIdentity>,
  ) {}

  async validateUser(email: string, password: string) {
    const account = await this.usersService.findByEmail(email, true);
    if (
      !account ||
      account.accountStatus !== AccountStatus.ACTIVE ||
      !account.passwordHash
    ) {
      return null;
    }

    if (!(await verifyPassword(password, account.passwordHash))) {
      return null;
    }

    return this.toPrincipal(account);
  }

  async signup(dto: SignupDto): Promise<Tokens> {
    const email = this.normalizeEmail(dto.email);
    if (await this.usersService.findByEmailIncludingDeleted(email)) {
      throw new ConflictException('An account with this email already exists');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const account = manager.create(UserAccount, {
          email,
          passwordHash: await hashPassword(dto.password),
          userRole: UserRole.STUDENT,
          accountStatus: AccountStatus.ACTIVE,
        });
        await manager.save(account);
        await manager.save(this.createStudent(manager, account, dto, email));
        return this.establishSession(manager, account);
      });
    } catch (error) {
      this.rethrowRegistrationConflict(error);
    }
  }

  async login(principal: {
    userAccountId: number;
    email: string;
    role: UserRole;
  }): Promise<Tokens> {
    return this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(UserAccount, {
        where: { userAccountId: principal.userAccountId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!account || account.accountStatus !== AccountStatus.ACTIVE) {
        throw new UnauthorizedException('Account is not active');
      }
      return this.establishSession(manager, account);
    });
  }

  async refreshTokens(
    userAccountId: number,
    refreshToken: string,
    tokenFamilyId: string,
  ): Promise<Tokens> {
    const result = await this.dataSource.transaction(async (manager) => {
      const account = await manager.findOne(UserAccount, {
        where: { userAccountId },
        lock: { mode: 'pessimistic_write' },
      });
      const session = await manager.findOne(AuthSession, {
        where: { userAccountId, revokedAt: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });

      if (!account || !session) {
        return null;
      }

      const valid =
        account.accountStatus === AccountStatus.ACTIVE &&
        session.expiresAt.getTime() > Date.now() &&
        session.tokenFamilyId === tokenFamilyId &&
        (await this.refreshTokenMatches(
          refreshToken,
          session.refreshTokenHash,
        ));

      if (!valid) {
        session.revokedAt = new Date();
        await manager.save(session);
        return null;
      }

      const tokens = await this.issueTokens(account, session.tokenFamilyId);
      session.refreshTokenHash = await this.hashRefreshToken(
        tokens.refreshToken,
      );
      session.expiresAt = this.getTokenExpiration(tokens.refreshToken);
      await manager.save(session);
      return tokens;
    });

    if (!result) {
      throw new UnauthorizedException('Access Denied');
    }
    return result;
  }

  async logout(userAccountId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(AuthSession)
        .set({ revokedAt: new Date() })
        .where('user_account_id = :userAccountId', { userAccountId })
        .andWhere('revoked_at IS NULL')
        .execute();
    });
  }

  async handleGoogleProfile(
    claims: GoogleIdentityClaims,
  ): Promise<GoogleAuthenticationResult> {
    if (!claims.providerSubject || !claims.email || !claims.emailVerified) {
      throw new UnauthorizedException(
        'Google authentication requires an explicitly verified email',
      );
    }

    const email = this.normalizeEmail(claims.email);
    const linkedIdentity = await this.oauthIdentityRepository.findOne({
      where: {
        authenticationProvider: AuthenticationProvider.GOOGLE,
        providerSubject: claims.providerSubject,
      },
    });

    if (linkedIdentity) {
      const linkedAccount = await this.usersService.findByIdIncludingDeleted(
        linkedIdentity.userAccountId,
      );
      if (!linkedAccount) {
        throw new ConflictException('Google identity has no account');
      }
      this.requireGoogleEligibleAccount(linkedAccount);
      return {
        requiresProfileCompletion: false,
        ...(await this.login(this.toPrincipal(linkedAccount))),
      };
    }

    const existingAccount =
      await this.usersService.findByEmailIncludingDeleted(email);
    if (existingAccount) {
      this.requireGoogleEligibleAccount(existingAccount);
      try {
        await this.dataSource.transaction(async (manager) => {
          const lockedAccount = await manager
            .getRepository(UserAccount)
            .createQueryBuilder('account')
            .withDeleted()
            .setLock('pessimistic_write')
            .where('account.userAccountId = :userAccountId', {
              userAccountId: existingAccount.userAccountId,
            })
            .getOneOrFail();
          this.requireGoogleEligibleAccount(lockedAccount);

          const accountIdentity = await manager.findOne(OAuthIdentity, {
            where: {
              userAccountId: lockedAccount.userAccountId,
              authenticationProvider: AuthenticationProvider.GOOGLE,
            },
          });
          if (
            accountIdentity &&
            accountIdentity.providerSubject !== claims.providerSubject
          ) {
            throw new ConflictException(
              'This account is already linked to another Google identity',
            );
          }
          if (!accountIdentity) {
            await manager.save(
              manager.create(OAuthIdentity, {
                userAccountId: lockedAccount.userAccountId,
                authenticationProvider: AuthenticationProvider.GOOGLE,
                providerSubject: claims.providerSubject,
                providerEmail: email,
              }),
            );
          }
        });
      } catch (error) {
        this.rethrowGoogleLinkConflict(error);
      }

      return {
        requiresProfileCompletion: false,
        ...(await this.login(this.toPrincipal(existingAccount))),
      };
    }

    const pendingRegistrationToken = await this.jwtService.signAsync(
      {
        type: 'google_pending_registration',
        sub: claims.providerSubject,
        email,
      } satisfies PendingGoogleRegistrationPayload,
      {
        secret: this.pendingRegistrationSecret,
        expiresIn: this.pendingRegistrationExpires,
      },
    );

    return {
      requiresProfileCompletion: true,
      pendingRegistrationToken,
      email,
    };
  }

  async completeGoogleSignup(dto: GoogleCompleteSignupDto): Promise<Tokens> {
    let pending: PendingGoogleRegistrationPayload;
    try {
      const decoded: unknown = await this.jwtService.verifyAsync(
        dto.pendingRegistrationToken,
        { secret: this.pendingRegistrationSecret },
      );
      pending = this.parsePendingRegistration(decoded);
    } catch {
      throw new UnauthorizedException(
        'Pending Google registration is invalid or expired',
      );
    }

    if (
      pending.type !== 'google_pending_registration' ||
      !pending.sub ||
      !pending.email
    ) {
      throw new UnauthorizedException('Invalid pending Google registration');
    }

    const email = this.normalizeEmail(pending.email);
    if (await this.usersService.findByEmailIncludingDeleted(email)) {
      throw new ConflictException('An account with this email already exists');
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const account = manager.create(UserAccount, {
          email,
          passwordHash: null,
          userRole: UserRole.STUDENT,
          accountStatus: AccountStatus.ACTIVE,
        });
        await manager.save(account);
        await manager.save(this.createStudent(manager, account, dto, email));
        await manager.save(
          manager.create(OAuthIdentity, {
            userAccountId: account.userAccountId,
            authenticationProvider: AuthenticationProvider.GOOGLE,
            providerSubject: pending.sub,
            providerEmail: email,
          }),
        );
        return this.establishSession(manager, account);
      });
    } catch (error) {
      this.rethrowRegistrationConflict(error);
    }
  }

  private async establishSession(
    manager: EntityManager,
    account: UserAccount,
  ): Promise<Tokens> {
    await manager
      .createQueryBuilder()
      .update(AuthSession)
      .set({ revokedAt: new Date() })
      .where('user_account_id = :userAccountId', {
        userAccountId: account.userAccountId,
      })
      .andWhere('revoked_at IS NULL')
      .execute();

    const tokenFamilyId = randomUUID();
    const tokens = await this.issueTokens(account, tokenFamilyId);
    await manager.save(
      manager.create(AuthSession, {
        userAccountId: account.userAccountId,
        refreshTokenHash: await this.hashRefreshToken(tokens.refreshToken),
        tokenFamilyId,
        expiresAt: this.getTokenExpiration(tokens.refreshToken),
        revokedAt: null,
      }),
    );
    return tokens;
  }

  private async issueTokens(
    account: UserAccount,
    tokenFamilyId: string,
  ): Promise<Tokens> {
    const basePayload = {
      sub: account.userAccountId,
      email: account.email,
      role: account.userRole,
      fid: tokenFamilyId,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { jti: randomUUID(), ...basePayload },
        {
          secret: this.accessSecret,
          expiresIn: this.accessExpires,
        },
      ),
      this.jwtService.signAsync(
        { jti: randomUUID(), ...basePayload } satisfies RefreshPayload,
        {
          secret: this.refreshSecret,
          expiresIn: this.refreshExpires,
        },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  private getTokenExpiration(token: string): Date {
    const decoded = this.jwtService.decode<{ exp?: number }>(token);
    if (!decoded?.exp) {
      throw new Error('Refresh token is missing an expiration');
    }
    return new Date(decoded.exp * 1000);
  }

  private hashRefreshToken(refreshToken: string): Promise<string> {
    return bcrypt.hash(this.digestRefreshToken(refreshToken), 10);
  }

  private refreshTokenMatches(
    refreshToken: string,
    storedHash: string,
  ): Promise<boolean> {
    return bcrypt.compare(this.digestRefreshToken(refreshToken), storedHash);
  }

  private digestRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('base64url');
  }

  private createStudent(
    manager: EntityManager,
    account: UserAccount,
    dto: StudentProfileDto,
    accountEmail: string,
  ): Student {
    return manager.create(Student, {
      userAccountId: account.userAccountId,
      firstName: dto.firstName.trim(),
      middleName: this.optionalText(dto.middleName),
      lastName: dto.lastName.trim(),
      extensionName: this.optionalText(dto.extensionName),
      sex: dto.sex.trim(),
      birthDate: dto.birthDate,
      contactNumber: dto.contactNumber.trim(),
      contactEmail: this.normalizeEmail(dto.contactEmail || accountEmail),
      linkedinUrl: this.optionalText(dto.linkedinUrl),
      addressLine: dto.addressLine.trim(),
      addressBarangay: dto.addressBarangay.trim(),
      addressDistrict: dto.addressDistrict.trim(),
      addressCity: dto.addressCity.trim(),
      inquiryMethod: dto.inquiryMethod,
      photoFilePath: this.optionalText(dto.photoFilePath),
    });
  }

  private requireGoogleEligibleAccount(account: UserAccount): void {
    if (
      account.userRole !== UserRole.STUDENT ||
      account.accountStatus !== AccountStatus.ACTIVE ||
      account.deletedAt
    ) {
      throw new ConflictException('Google cannot be linked to this account');
    }
  }

  private toPrincipal(account: UserAccount) {
    return {
      userAccountId: account.userAccountId,
      email: account.email,
      role: account.userRole,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private optionalText(value?: string): string | null {
    return value?.trim() || null;
  }

  private get accessSecret(): string {
    return (
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'super_secret_access_key_change_me_in_production'
    );
  }

  private get refreshSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'super_secret_refresh_key_change_me_in_production'
    );
  }

  private get pendingRegistrationSecret(): string {
    return (
      this.configService.get<string>('GOOGLE_PENDING_REGISTRATION_SECRET') ||
      this.accessSecret
    );
  }

  private get accessExpires(): JwtSignOptions['expiresIn'] {
    return (this.configService.get<string>('JWT_ACCESS_EXPIRES') ||
      '15m') as JwtSignOptions['expiresIn'];
  }

  private get refreshExpires(): JwtSignOptions['expiresIn'] {
    return (this.configService.get<string>('JWT_REFRESH_EXPIRES') ||
      '7d') as JwtSignOptions['expiresIn'];
  }

  private get pendingRegistrationExpires(): JwtSignOptions['expiresIn'] {
    return (this.configService.get<string>(
      'GOOGLE_PENDING_REGISTRATION_EXPIRES',
    ) || '10m') as JwtSignOptions['expiresIn'];
  }

  private parsePendingRegistration(
    value: unknown,
  ): PendingGoogleRegistrationPayload {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('type' in value) ||
      !('sub' in value) ||
      !('email' in value) ||
      value.type !== 'google_pending_registration' ||
      typeof value.sub !== 'string' ||
      typeof value.email !== 'string'
    ) {
      throw new UnauthorizedException('Invalid pending Google registration');
    }
    return {
      type: value.type,
      sub: value.sub,
      email: value.email,
    };
  }

  private rethrowRegistrationConflict(error: unknown): never {
    if (this.isUniqueViolation(error)) {
      throw new ConflictException('An account with this email already exists');
    }
    throw error;
  }

  private rethrowGoogleLinkConflict(error: unknown): never {
    if (error instanceof ConflictException) {
      throw error;
    }
    if (this.isUniqueViolation(error)) {
      throw new ConflictException('Google identity is already linked');
    }
    throw error;
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    );
  }
}
