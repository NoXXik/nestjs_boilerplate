import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    // Минимально: берём email из тела запроса
    const email: string = body?.email;
    const userId = body?.userId || email || 'anon';
    const { accessToken, refreshToken } = await this.authService.signTokens(userId, email || 'user@example.com');
    this.authService.setRefreshCookie(res, refreshToken);
    // По желанию можно также установить access-token в куку
    return { accessToken };
  }

  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = (req as any).user as { userId: string | number; email: string };
    const { accessToken, refreshToken } = await this.authService.signTokens(user.userId, user.email);
    this.authService.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    this.authService.clearRefreshCookie(res);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@Req() req: Request) {
    return { user: (req as any).user };
  }
}
