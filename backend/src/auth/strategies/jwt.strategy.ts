import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccountStatus } from '../../users/entities/account.entities';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: number;
  role: string;
  family: string;
  type: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    const secret = config.get<string>('JWT_ACCESS_SECRET');
    if (!secret) throw new Error('JWT_ACCESS_SECRET is required');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }
  async validate(payload: JwtPayload) {
    if (payload.type !== 'access' || !payload.family)
      throw new UnauthorizedException('Invalid access token');
    const current = await this.users.getCurrentAccount(payload.sub);
    if (
      !current ||
      current.account.accountStatus !== AccountStatus.ACTIVE ||
      current.account.deletedAt
    ) {
      throw new UnauthorizedException('Account is not active');
    }
    return {
      userAccountId: current.account.userAccountId,
      userRole: current.account.userRole,
      family: payload.family,
    };
  }
}
