import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { AccountStatus, AuthProvider, UserRole } from '../users/user.entity';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  getCookieOptions(): {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
    path: string;
    maxAge: number;
  } {
    return {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: (this.configService.get('COOKIE_SAMESITE') || 'strict') as any,
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    if (user.authProvider === AuthProvider.GOOGLE) {
      return null;
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      return null;
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      return null;
    }

    const { password, hashedRefreshToken, ...result } = user;
    return result;
  }

  async login(user: any): Promise<Tokens> {
    const family = uuidv4();
    const tokens = await this.getTokens(user.userId, user.email, user.role);
    await this.updateRefreshTokenHash(user.userId, tokens.refreshToken);
    await this.usersService.updateRefreshTokenFamily(user.userId, family);
    return tokens;
  }

  async refreshTokens(userId: number, refreshToken: string): Promise<Tokens> {
    const user = await this.usersService.findById(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access Denied');
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    const refreshTokenMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );
    if (!refreshTokenMatches) {
      await this.usersService.updateRefreshToken(userId, null);
      await this.usersService.updateRefreshTokenFamily(userId, null);
      throw new UnauthorizedException('Refresh token reuse detected. All sessions revoked.');
    }

    const tokens = await this.getTokens(user.userId, user.email, user.role);
    await this.updateRefreshTokenHash(user.userId, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: number): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
    await this.usersService.updateRefreshTokenFamily(userId, null);
  }

  async signup(email: string, password: string): Promise<Tokens> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      role: UserRole.STUDENT,
      authProvider: AuthProvider.LOCAL,
      accountStatus: AccountStatus.ACTIVE,
    });

    return this.login(user);
  }

  async googleLogin(profile: { googleId: string; email: string }): Promise<Tokens> {
    let user = await this.usersService.findByGoogleId(profile.googleId);

    if (!user) {
      const existingByEmail = await this.usersService.findByEmail(profile.email);
      if (existingByEmail) {
        existingByEmail.googleId = profile.googleId;
        existingByEmail.authProvider = AuthProvider.GOOGLE;
        user = await this.usersService.create(existingByEmail);
      } else {
        user = await this.usersService.create({
          email: profile.email,
          password: 'GOOGLE_OAUTH_NO_PASSWORD',
          googleId: profile.googleId,
          authProvider: AuthProvider.GOOGLE,
          role: UserRole.STUDENT,
          accountStatus: AccountStatus.ACTIVE,
        });
      }
    }

    if (user.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    return this.login(user);
  }

  async updateRefreshTokenHash(userId: number, refreshToken: string): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(userId, hash);
  }

  async getTokens(userId: number, email: string, role: string): Promise<Tokens> {
    const payload = {
      sub: userId,
      email,
      role,
    };

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const accessExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES');

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpires as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpires as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
