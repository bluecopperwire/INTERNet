import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { GoogleIdentityClaims } from '../auth.service';

type GoogleProfile = Profile & {
  _json?: {
    email?: string;
    email_verified?: boolean;
    sub?: string;
  };
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID:
        configService.get<string>('GOOGLE_CLIENT_ID') ||
        'google-client-id-not-configured',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') ||
        'google-client-secret-not-configured',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GoogleProfile,
  ): GoogleIdentityClaims {
    const providerSubject = profile.id || profile._json?.sub;
    const email = profile._json?.email || profile.emails?.[0]?.value;
    const emailVerified = profile._json?.email_verified === true;

    if (!providerSubject || !email || !emailVerified) {
      throw new UnauthorizedException(
        'Google authentication requires an explicitly verified email',
      );
    }

    return { providerSubject, email, emailVerified };
  }
}
