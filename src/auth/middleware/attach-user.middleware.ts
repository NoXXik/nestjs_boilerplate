import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AttachUserMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    try {
      const auth = req.headers.authorization;
      let token: string | undefined;
      if (auth?.startsWith('Bearer ')) token = auth.split(' ')[1];
      if (!token && (req as any).cookies) {
        token = (req as any).cookies['access_token'];
      }
      if (token) {
        const payload = this.jwtService.verify(token, {
          secret: process.env.JWT_ACCESS_SECRET || 'access_secret',
        });
        (req as any).user = { userId: payload.sub, email: payload.email };
      }
    } catch (_) {
      // игнорируем ошибки валидации (пользователь остаётся неаутентифицированным)
    }
    next();
  }
}
