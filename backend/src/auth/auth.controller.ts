import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { UserRole } from '../users/user-account.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type {
  GoogleAuthenticationResult,
  GoogleIdentityClaims,
  Tokens,
} from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleCompleteSignupDto } from './dto/google-complete-signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SignupDto } from './dto/signup.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @HttpCode(HttpStatus.CREATED)
  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Tokens> {
    const tokens = await this.authService.signup(dto);
    this.setRefreshCookie(response, tokens.refreshToken);
    return tokens;
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Req()
    request: Request & {
      user: { userAccountId: number; email: string; role: UserRole };
    },
    @Body() _dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Tokens> {
    const tokens = await this.authService.login(request.user);
    this.setRefreshCookie(response, tokens.refreshToken);
    return tokens;
  }

  @UseGuards(JwtRefreshAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @CurrentUser('userAccountId') userAccountId: number,
    @CurrentUser('refreshToken') refreshToken: string,
    @CurrentUser('tokenFamilyId') tokenFamilyId: string,
    @Body() _dto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Tokens> {
    const tokens = await this.authService.refreshTokens(
      userAccountId,
      refreshToken,
      tokenFamilyId,
    );
    this.setRefreshCookie(response, tokens.refreshToken);
    return tokens;
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @CurrentUser('userAccountId') userAccountId: number,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(userAccountId);
    response.clearCookie('refreshToken', this.cookieOptions);
    return { message: 'Successfully logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser('userAccountId') userAccountId: number) {
    return this.usersService.getMe(userAccountId);
  }

  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin(): void {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleCallback(
    @Req() request: Request & { user: GoogleIdentityClaims },
    @Res({ passthrough: true }) response: Response,
  ): Promise<GoogleAuthenticationResult> {
    const result = await this.authService.handleGoogleProfile(request.user);
    if (!result.requiresProfileCompletion) {
      this.setRefreshCookie(response, result.refreshToken);
    }
    return result;
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('google/complete-signup')
  async completeGoogleSignup(
    @Body() dto: GoogleCompleteSignupDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Tokens> {
    const tokens = await this.authService.completeGoogleSignup(dto);
    this.setRefreshCookie(response, tokens.refreshToken);
    return tokens;
  }

  private setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie('refreshToken', refreshToken, this.cookieOptions);
  }

  private get cookieOptions() {
    const sameSiteValue = (
      this.configService.get<string>('COOKIE_SAMESITE') || 'lax'
    ).toLowerCase();
    const sameSite = ['lax', 'strict', 'none'].includes(sameSiteValue)
      ? (sameSiteValue as 'lax' | 'strict' | 'none')
      : 'lax';
    const domain = this.configService.get<string>('COOKIE_DOMAIN');
    return {
      httpOnly: true,
      secure:
        this.configService.get<string>('NODE_ENV') === 'production' ||
        sameSite === 'none',
      sameSite,
      path: '/auth',
      ...(domain ? { domain } : {}),
    };
  }
}
