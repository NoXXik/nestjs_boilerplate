import { HttpException, Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { Response } from 'express';
import { UserService } from 'src/user/user.service';
import * as crypto from 'crypto';
import { Role } from 'src/user/dto/user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

export interface AuthJwtPayload {
  sub: number | string;
  email: string;
  roleId?: string;
  roleCode?: string;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly prisma: PrismaService,
  ) {}

  async signTokens(
    userId: number | string,
    email: string,
    roleId?: string,
    roleCode?: string,
  ): Promise<Tokens> {
    const payload: AuthJwtPayload = {
      sub: userId,
      email,
      roleId,
      roleCode,
    };

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

  async register(email: string, password: string, name: string) {
    const user_db = await this.userService.findByEmail(email);
    if (user_db) {
      throw new HttpException('User already exists', 400);
    }
    const passwordHash = await crypto.hash('sha256', password);
    const role = await (this.prisma as any).role.findUnique({
      where: { code: 'USER' },
    });
    const user = await this.userService.create({
      email,
      passwordHash,
      roleId: role?.id,
      name,
    });
    return user;
  }

  async login(email: string, password: string) {
    const user_db = await this.userService.findByEmail(email);
    if (!user_db) {
      throw new HttpException('User not found', 404);
    }
    const passwordHash = await crypto.hash('sha256', password);
    if (user_db.passwordHash !== passwordHash) {
      throw new HttpException('Invalid password', 401);
    }
    const { accessToken, refreshToken } = await this.signTokens(
      user_db.id,
      user_db.email,
      user_db.roleId,
      (user_db as any).role ?? (user_db as any).roleCode ?? undefined,
    );
    await this.userService.update(user_db.id, {
      refreshTokenHash: refreshToken,
    });
    user_db.passwordHash = undefined;
    user_db.refreshTokenHash = undefined;
    return { accessToken, refreshToken, user: user_db };
  }

  async refreshToken(userRefreshToken: string) {
    const user_db =
      await this.userService.findByRefreshTokenHash(userRefreshToken);
    if (!user_db) {
      throw new HttpException('Invalid refresh token', 401);
    }
    if (user_db.refreshTokenHash !== userRefreshToken) {
      throw new HttpException('Invalid refresh token', 401);
    }
    const { accessToken, refreshToken } = await this.signTokens(
      user_db.id,
      user_db.email,
      user_db.roleId,
      (user_db as any).role ?? (user_db as any).roleCode ?? undefined,
    );
    await this.userService.update(user_db.id, {
      refreshTokenHash: refreshToken,
    });
    return { accessToken, refreshToken };
  }
}
