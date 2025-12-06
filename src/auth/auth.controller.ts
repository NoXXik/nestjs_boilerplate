import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { Request, Response } from 'express';
import { ApiResponse } from 'src/app.dto';
import {
  loginSchema,
  parseBody,
  registerSchema,
} from './validation/auth.schemas';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const { email, password, name } = parseBody(registerSchema, body);
    const user = await this.authService.register(email, password, name);
    return new ApiResponse({
      success: true,
      message: 'User registered successfully',
      data: user,
    });
  }

  @Post('login')
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { email, password } = parseBody(loginSchema, body);
    const tokens = await this.authService.login(email, password);
    this.authService.setRefreshCookie(res, tokens.refreshToken);
    return new ApiResponse({
      success: true,
      message: 'User logged in successfully',
      data: tokens,
    });
  }

  // @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshTokenCookie = (req as any).cookies['refresh_token'];
    if (!refreshTokenCookie) {
      throw new HttpException('Refresh token not found', 401);
    }
    const { accessToken, refreshToken } =
      await this.authService.refreshToken(refreshTokenCookie);
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
