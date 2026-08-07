import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UserRole } from '../../users/user-account.entity';

interface RefreshRequest {
  body?: { refreshToken?: unknown };
  cookies?: Record<string, unknown>;
}

interface RefreshJwtPayload {
  sub: number;
  email: string;
  role: UserRole;
  fid: string;
}

function extractRefreshToken(request: Request): string | null {
  const typedRequest = request as unknown as RefreshRequest;
  const bodyToken = typedRequest.body?.refreshToken;
  if (typeof bodyToken === 'string') {
    return bodyToken;
  }
  const cookieToken = typedRequest.cookies?.refreshToken;
  if (typeof cookieToken === 'string') {
    return cookieToken;
  }
  return ExtractJwt.fromAuthHeaderAsBearerToken()(request);
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractRefreshToken]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_REFRESH_SECRET') ||
        'super_secret_refresh_key_change_me_in_production',
      passReqToCallback: true,
    });
  }

  validate(request: Request, payload: RefreshJwtPayload) {
    const refreshToken = extractRefreshToken(request);
    if (!refreshToken || !payload.fid) {
      throw new UnauthorizedException('Refresh token is missing');
    }
    return {
      userAccountId: payload.sub,
      email: payload.email,
      role: payload.role,
      tokenFamilyId: payload.fid,
      refreshToken,
    };
  }
}
