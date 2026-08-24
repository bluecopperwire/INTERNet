import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_REFRESH_SECRET');
    if (!secret) throw new Error('JWT_REFRESH_SECRET is required');
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.refresh_token ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }
  validate(
    req: Request,
    payload: { sub: number; family: string; jti: string; type: string },
  ) {
    const refreshToken = req?.cookies?.refresh_token;
    if (
      !refreshToken ||
      payload.type !== 'refresh' ||
      !payload.family ||
      !payload.jti
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return { userAccountId: payload.sub, family: payload.family, refreshToken };
  }
}
