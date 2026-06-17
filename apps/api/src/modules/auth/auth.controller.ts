import {
  Body,
  Controller,
  Get,
  Post,
  Param,
  Req,
  Res,
  Delete,
  UseGuards,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  LoginBody,
  RefreshBody,
  RegisterBody,
  VerifyEmailBody,
  VerifyOtpBody,
  ChangePasswordBody,
  ForgotPasswordBody,
  ResetPasswordBody,
} from './dto';
import { SessionContext } from './sessions.service';
import { Public, CurrentUser, RequestUser } from '../../common/decorators';

function ctxFrom(req: Request): SessionContext {
  return {
    userAgent: req.headers['user-agent'] ?? null,
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || null,
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  register(@Body() body: RegisterBody, @Req() req: Request) {
    return this.auth.register(body, ctxFrom(req));
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() body: LoginBody, @Req() req: Request) {
    return this.auth.login(body.email, body.password, ctxFrom(req));
  }

  @Public()
  @Post('refresh')
  refresh(@Body() body: RefreshBody) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: RequestUser) {
    await this.auth.logout(user.sid ?? '');
    return { ok: true };
  }

  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(@CurrentUser() user: RequestUser) {
    await this.auth.logoutAll(user.id);
    return { ok: true };
  }

  @Get('sessions')
  sessions(@CurrentUser() user: RequestUser) {
    return this.auth.listSessions(user.id, user.sid);
  }

  @Delete('sessions/:id')
  @HttpCode(200)
  async revokeSession(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    await this.auth.revokeSession(user.id, id);
    return { ok: true };
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return user;
  }

  @Post('change-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  async changePassword(@CurrentUser() user: RequestUser, @Body() body: ChangePasswordBody) {
    await this.auth.changePassword(user.id, body.currentPassword, body.newPassword);
    return { ok: true };
  }

  // ---- Email verification ----
  @Public()
  @Post('verify-email')
  @HttpCode(200)
  async verifyEmail(@Body() body: VerifyEmailBody) {
    await this.auth.verifyEmail(body.token);
    return { ok: true };
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @HttpCode(200)
  async verifyOtp(@CurrentUser() user: RequestUser, @Body() body: VerifyOtpBody) {
    return this.auth.verifyEmailOtp(user.id, body.code);
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(200)
  async resend(@CurrentUser() user: RequestUser) {
    await this.auth.resendVerification(user.id);
    return { ok: true };
  }

  // ---- Password reset ----
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(200)
  async forgot(@Body() body: ForgotPasswordBody) {
    await this.auth.forgotPassword(body.email);
    return { ok: true };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(200)
  async reset(@Body() body: ResetPasswordBody) {
    await this.auth.resetPassword(body.token, body.password);
    return { ok: true };
  }

  // ---- Google OAuth ----
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  google() {
    // Passport redirects to Google.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request & { user?: any }, @Res() res: Response) {
    if (!req.user) throw new UnauthorizedException('Google auth failed.');
    const result = await this.auth.loginWithGoogle(req.user, ctxFrom(req));
    const web = this.config.get<string>('webOrigin');
    res.redirect(
      `${web}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
    );
  }
}
