import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import { ACCESS_CHECK_KEY, AccessRequirement } from '../decorators/require-access.decorator';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.get<AccessRequirement>(
      ACCESS_CHECK_KEY,
      context.getHandler(),
    );
    if (!requirement) return true;

    const req = context.switchToHttp().getRequest();
    const user = (req as any).user;
    if (!user?.userId) {
      throw new ForbiddenException('Unauthorized');
    }

    // Determine roleId: prefer attached roleId/roleCode, fallback to DB lookup
    let roleId: string | undefined = user.roleId;
    if (!roleId) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: Number(user.userId) || user.userId },
      });
      roleId = dbUser?.roleId ?? undefined;
    }
    if (!roleId) {
      throw new ForbiddenException('Role not assigned');
    }

    const hasAccess = await this.prisma.access.findFirst({
      where: {
        roleId,
        module: { code: requirement.moduleCode },
        tab: { code: requirement.tabCode },
        action: { code: requirement.actionCode },
      },
      select: { id: true },
    });

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}

