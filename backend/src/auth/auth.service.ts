import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AccountStatus, User } from '../users/user.entity';

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
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
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
    const tokens = await this.getTokens(user.userId, user.email, user.role);
    await this.updateRefreshTokenHash(user.userId, tokens.refreshToken);
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
      throw new UnauthorizedException('Access Denied');
    }

    const tokens = await this.getTokens(user.userId, user.email, user.role);
    await this.updateRefreshTokenHash(user.userId, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: number): Promise<void> {
    await this.usersService.updateRefreshToken(userId, null);
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

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET') || 'super_secret_access_key_change_me_in_production';
    const accessExpires = this.configService.get<string>('JWT_ACCESS_EXPIRES') || '15m';

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || 'super_secret_refresh_key_change_me_in_production';
    const refreshExpires = this.configService.get<string>('JWT_REFRESH_EXPIRES') || '7d';

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
