import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

function extractToken(req: Request): string | null {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  const token = req.cookies?.['access_token'];
  return token || null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractToken]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'access_secret',
    });
  }

  async validate(payload: any) {
    // payload: { sub, email, roleId?, roleCode?, iat, exp }
    return {
      userId: payload.sub,
      email: payload.email,
      roleId: payload.roleId,
      roleCode: payload.roleCode,
    };
  }
}
