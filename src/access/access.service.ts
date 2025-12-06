import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateAccessDto } from './dto/update-access.dto';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertAccess(dto: UpdateAccessDto) {
    const role = await this.prisma.role.findUnique({
      where: { code: dto.roleCode },
      select: { id: true },
    });
    if (!role) throw new Error('Role not found');

    const module = await this.prisma.module.findUnique({
      where: { code: dto.moduleCode },
      select: { id: true },
    });
    if (!module) throw new Error('Module not found');

    const tab = await this.prisma.tab.findFirst({
      where: { moduleId: module.id, code: dto.tabCode },
      select: { id: true },
    });
    if (!tab) throw new Error('Tab not found');

    const actions = await this.prisma.action.findMany({
      where: { code: { in: dto.actionCodes } },
      select: { id: true, code: true },
    });
    if (actions.length !== dto.actionCodes.length) {
      throw new Error('Some actions not found');
    }

    // Replace existing accesses for this role/module/tab with provided action set
    await this.prisma.access.deleteMany({
      where: {
        roleId: role.id,
        moduleId: module.id,
        tabId: tab.id,
      },
    });

    await this.prisma.access.createMany({
      data: actions.map((a) => ({
        roleId: role.id,
        moduleId: module.id,
        tabId: tab.id,
        actionId: a.id,
      })),
      skipDuplicates: true,
    });

    return { ok: true };
  }

  async getMatrixForRole(roleId?: string, roleCode?: string) {
    if (!roleId && !roleCode) {
      throw new Error('No role ID or code provided');
    }
    const role = await this.prisma.role.findUnique({
      where: roleId ? { id: roleId } : { code: roleCode },
      select: { id: true },
    });
    if (!role) {
      throw new Error('Role not found');
    }

    const rows = await this.prisma.access.findMany({
      where: {
        roleId: role.id,
      },
      select: {
        module: { select: { code: true, name: true } },
        tab: { select: { code: true, name: true } },
        action: { select: { code: true, name: true } },
      },
    });

    const modulesMap = new Map<
      string,
      {
        code: string;
        name: string;
        tabs: Map<
          string,
          {
            code: string;
            name: string;
            actions: { code: string; name: string }[];
          }
        >;
      }
    >();

    for (const row of rows) {
      const mCode = row.module.code;
      const tCode = row.tab.code;
      if (!modulesMap.has(mCode)) {
        modulesMap.set(mCode, {
          code: row.module.code,
          name: row.module.name,
          tabs: new Map(),
        });
      }
      const mod = modulesMap.get(mCode)!;
      if (!mod.tabs.has(tCode)) {
        mod.tabs.set(tCode, {
          code: row.tab.code,
          name: row.tab.name,
          actions: [],
        });
      }
      const tab = mod.tabs.get(tCode)!;
      tab.actions.push({ code: row.action.code, name: row.action.name });
    }

    return Array.from(modulesMap.values()).map((m) => ({
      code: m.code,
      name: m.name,
      tabs: Array.from(m.tabs.values()),
    }));
  }

  async getMatrixForAllRoles() {
    const roles = await this.prisma.role.findMany({
      select: { id: true, code: true, name: true },
    });
    const modules = await this.prisma.module.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        tabs: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
    const actions = await this.prisma.action.findMany({
      select: { id: true, code: true, name: true },
    });
    const matrices = await Promise.all(
      roles.map(async (r) => ({
        [r.code]: await this.getMatrixForRole(r.id),
      })),
    );
    return { modules, actions, roles, matrices };
  }
}
