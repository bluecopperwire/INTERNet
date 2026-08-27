import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { GoogleOauthService } from './google-oauth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from './guards/jwt-refresh-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import {
  ChangePasswordDto,
  GoogleStudentCompletionDto,
  PasswordDto,
  PesoRegistrationDto,
  SignupDto,
} from './dto/signup.dto';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly google: GoogleOauthService,
    private readonly users: UsersService,
  ) {}

  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(
      'refresh_token',
      refreshToken,
      this.auth.getCookieOptions('/auth'),
    );
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie('refresh_token', this.auth.getCookieOptions('/auth'));
  }

  private setGoogleStateCookie(res: Response, state: string): void {
    res.cookie('google_oauth_state', state, {
      ...this.auth.getCookieOptions('/auth/google/callback'),
      maxAge: 10 * 60_000,
    });
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.registerStudent(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('register/peso')
  async registerPeso(
    @Body() dto: PesoRegistrationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.registerPeso(dto);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken, verificationStatus: 'approved' };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Req() req: Request & { user: any },
    @Body() _dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.login(req.user);
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  async refresh(
    @CurrentUser('userAccountId') userAccountId: number,
    @CurrentUser('family') family: string,
    @CurrentUser('refreshToken') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.auth.refreshTokens(
      userAccountId,
      family,
      refreshToken,
    );
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser('family') family: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(family);
    this.clearRefreshCookie(res);
    return { message: 'Successfully logged out' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(
    @CurrentUser('userAccountId') userAccountId: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logoutAll(userAccountId);
    this.clearRefreshCookie(res);
    return { message: 'All sessions revoked' };
  }

  @Get('google')
  async googleLoginStart(@Res() res: Response): Promise<void> {
    const authorization = await this.google.authorization('login');
    this.setGoogleStateCookie(res, authorization.state);
    res.redirect(authorization.url);
  }

  @Get('google/signup')
  async googleSignupStart(@Res() res: Response): Promise<void> {
    const authorization = await this.google.authorization('signup');
    this.setGoogleStateCookie(res, authorization.state);
    res.redirect(authorization.url);
  }

  @UseGuards(JwtAuthGuard)
  @Post('google/link')
  async googleLinkStart(
    @CurrentUser('userAccountId') userAccountId: number,
    @Body() dto: PasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.verifyLocalReauthentication(userAccountId, dto.password);
    const authorization = await this.google.authorization(
      'link',
      userAccountId,
    );
    this.setGoogleStateCookie(res, authorization.state);
    return { authorizationUrl: authorization.url };
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.google.callback(
      code,
      state,
      req.cookies?.google_oauth_state,
    );
    res.clearCookie(
      'google_oauth_state',
      this.auth.getCookieOptions('/auth/google/callback'),
    );
    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    if (result.intent === 'signup') {
      const onboarding = await this.auth.beginGoogleSignup(result.profile);
      res.cookie('google_onboarding', onboarding.onboardingToken, {
        ...this.auth.getCookieOptions('/auth/google/signup/complete'),
        maxAge: 30 * 60_000,
      });
      res.redirect(`${frontend}/register/student/profile?source=google`);
      return;
    }
    if (result.intent === 'link') {
      if (!result.userAccountId)
        throw new UnauthorizedException('Missing link account');
      await this.auth.linkGoogleAfterReauthentication(
        result.userAccountId,
        result.profile,
      );
      res.redirect(`${frontend}/settings/security?google=linked`);
      return;
    }
    const tokens = await this.auth.googleLogin(result.profile);
    this.setRefreshCookie(res, tokens.refreshToken);
    res.cookie('google_login_result', tokens.accessToken, {
      ...this.auth.getCookieOptions('/auth/google/exchange'),
      maxAge: 2 * 60_000,
    });
    res.redirect(`${frontend}/auth/callback?status=success`);
  }

  @Post('google/exchange')
  googleExchange(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const accessToken = req.cookies?.google_login_result;
    if (!accessToken)
      throw new UnauthorizedException(
        'Google login result is missing or expired',
      );
    res.clearCookie(
      'google_login_result',
      this.auth.getCookieOptions('/auth/google/exchange'),
    );
    return { accessToken };
  }

  @Post('google/signup/complete')
  async googleSignupComplete(
    @Req() req: Request,
    @Body() dto: GoogleStudentCompletionDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.google_onboarding;
    if (!token)
      throw new UnauthorizedException('Google onboarding cookie is missing');
    const tokens = await this.auth.completeGoogleStudent(token, dto);
    res.clearCookie(
      'google_onboarding',
      this.auth.getCookieOptions('/auth/google/signup/complete'),
    );
    this.setRefreshCookie(res, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('google/link')
  async unlinkGoogle(@CurrentUser('userAccountId') userAccountId: number) {
    await this.auth.unlinkGoogle(userAccountId);
    return { message: 'Google identity unlinked' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('password')
  async setPassword(
    @CurrentUser('userAccountId') userAccountId: number,
    @Body() dto: PasswordDto,
  ) {
    await this.auth.setLocalPassword(userAccountId, dto.password);
    return { message: 'Local password added' };
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  async changePassword(
    @CurrentUser('userAccountId') userAccountId: number,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.auth.changeLocalPassword(
      userAccountId,
      dto.currentPassword,
      dto.password,
    );
    return { message: 'Local password changed' };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('password')
  async removePassword(@CurrentUser('userAccountId') userAccountId: number) {
    await this.auth.removeLocalPassword(userAccountId);
    return { message: 'Local password removed' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser('userAccountId') userAccountId: number) {
    const current = await this.users.getCurrentAccount(userAccountId);
    if (!current) throw new UnauthorizedException();
    return {
      userAccountId: current.account.userAccountId,
      email: current.account.email,
      userRole: current.account.userRole,
      accountStatus: current.account.accountStatus,
      verificationStatus: current.verificationStatus,
      studentId: current.studentId,
      companyId: current.companyId,
      pesoPersonnelId: current.pesoPersonnelId,
    };
  }
}
