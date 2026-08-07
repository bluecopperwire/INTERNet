import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccountStatus, UserRole } from '../../users/user-account.entity';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'super_secret_access_key_change_me_in_production',
    });
  }

  async validate(payload: JwtPayload) {
    const account = await this.usersService.findById(payload.sub);
    if (!account || account.accountStatus !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }
    return {
      userAccountId: account.userAccountId,
      email: account.email,
      role: account.userRole,
    };
  }
}
