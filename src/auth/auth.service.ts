import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Response } from 'express';

export interface AuthJwtPayload {
  sub: number | string;
  email: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async signTokens(userId: number | string, email: string): Promise<Tokens> {
    const payload: AuthJwtPayload = { sub: userId, email };

    const accessOptions: JwtSignOptions = {
      secret: process.env.JWT_ACCESS_SECRET || 'access_secret',
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
    };

    const refreshOptions: JwtSignOptions = {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, accessOptions),
      this.jwtService.signAsync(payload, refreshOptions),
    ]);

    return { accessToken, refreshToken };
  }

  setRefreshCookie(res: Response, refreshToken: string) {
    const days = parseInt(process.env.JWT_REFRESH_DAYS || '7', 10);
    const maxAgeMs = days * 24 * 60 * 60 * 1000;
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: maxAgeMs,
      path: '/',
    });
  }

  clearRefreshCookie(res: Response) {
    res.clearCookie('refresh_token', { path: '/' });
  }
}
