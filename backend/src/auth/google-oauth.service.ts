import { randomBytes } from 'node:crypto';
import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { GoogleProfile } from './auth.service';

export type GoogleIntent = 'login' | 'signup' | 'link';

interface GoogleState {
  intent: GoogleIntent;
  nonce: string;
  userAccountId?: number;
  type: 'google_oauth_state';
}

@Injectable()
export class GoogleOauthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  private required(name: string): string {
    const value = this.config.get<string>(name);
    if (!value)
      throw new ServiceUnavailableException(
        `Google OAuth is disabled because ${name} is not configured`,
      );
    return value;
  }

  async authorization(
    intent: GoogleIntent,
    userAccountId?: number,
  ): Promise<{ url: string; state: string }> {
    const state = await this.jwt.signAsync(
      {
        intent,
        userAccountId,
        nonce: randomBytes(24).toString('base64url'),
        type: 'google_oauth_state',
      },
      {
        secret: this.required('JWT_ACCESS_SECRET'),
        expiresIn: '10m',
        audience: 'google-oauth-state',
      },
    );
    const query = new URLSearchParams({
      client_id: this.required('GOOGLE_CLIENT_ID'),
      redirect_uri: this.required('GOOGLE_CALLBACK_URL'),
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${query}`,
      state,
    };
  }

  async callback(
    code: string,
    state: string,
    cookieState: string | undefined,
  ): Promise<{
    intent: GoogleIntent;
    userAccountId?: number;
    profile: GoogleProfile;
  }> {
    if (!cookieState || cookieState !== state)
      throw new UnauthorizedException('Invalid Google OAuth state');
    const payload = await this.jwt.verifyAsync<GoogleState>(state, {
      secret: this.required('JWT_ACCESS_SECRET'),
      audience: 'google-oauth-state',
    });
    if (
      payload.type !== 'google_oauth_state' ||
      !['login', 'signup', 'link'].includes(payload.intent)
    ) {
      throw new UnauthorizedException('Invalid Google OAuth intent');
    }
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.required('GOOGLE_CLIENT_ID'),
        client_secret: this.required('GOOGLE_CLIENT_SECRET'),
        redirect_uri: this.required('GOOGLE_CALLBACK_URL'),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenResponse.ok)
      throw new UnauthorizedException(
        'Google authorization code exchange failed',
      );
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token)
      throw new UnauthorizedException('Google did not return an access token');
    const profileResponse = await fetch(
      'https://openidconnect.googleapis.com/v1/userinfo',
      {
        headers: { authorization: `Bearer ${token.access_token}` },
      },
    );
    if (!profileResponse.ok)
      throw new UnauthorizedException('Google profile verification failed');
    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      given_name?: string;
      family_name?: string;
    };
    return {
      intent: payload.intent,
      userAccountId: payload.userAccountId,
      profile: {
        providerSubject: profile.sub ?? '',
        email: profile.email ?? '',
        emailVerified: profile.email_verified === true,
        firstName: profile.given_name,
        lastName: profile.family_name,
      },
    };
  }
}
