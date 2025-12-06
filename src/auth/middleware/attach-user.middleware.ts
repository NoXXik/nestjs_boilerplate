import { Injectable, NestMiddleware } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AttachUserMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
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
        let roleCode: string | undefined;
        let roleId: string | undefined;
        try {
          const user = await this.prisma.user.findUnique({
            where: { id: Number(payload.sub) || payload.sub },
            include: { role: true },
          });
          roleId = user?.roleId ?? undefined;
          roleCode = user?.role?.code ?? undefined;
        } catch (_) {
          // ignore db errors, proceed without role
        }
        (req as any).user = {
          userId: payload.sub,
          email: payload.email,
          roleId,
          roleCode,
        };
      }
    } catch (_) {
      // игнорируем ошибки валидации (пользователь остаётся неаутентифицированным)
    }
    next();
  }
}
