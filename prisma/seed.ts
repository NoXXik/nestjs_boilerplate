import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

// Use PG adapter (Prisma 7 client engine requires adapter or accelerateUrl)
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // base roles
  const roles = [
    { code: 'ADMIN', name: 'Administrator' },
    { code: 'USER', name: 'User' },
  ];

  // base actions
  const actions = [
    { code: 'VIEW', name: 'View' },
    { code: 'EDIT', name: 'Edit' },
    { code: 'DELETE', name: 'Delete' },
  ];

  // base modules with tabs
  const modules = [
    {
      code: 'ORDERS',
      name: 'Orders',
      tabs: [
        { code: 'LIST', name: 'List' },
        { code: 'DETAILS', name: 'Details' },
      ],
    },
    {
      code: 'ANALYTICS',
      name: 'Analytics',
      tabs: [{ code: 'DASHBOARD', name: 'Dashboard' }],
    },
  ];

  // Access matrix: ADMIN -> all, USER -> view list/dashboard
  const accessMatrix = [
    // ADMIN full
    ...modules.flatMap((m) =>
      m.tabs.flatMap((t) =>
        actions.map((a) => ({
          moduleCode: m.code,
          tabCode: t.code,
          actionCode: a.code,
          roleCode: 'ADMIN',
        })),
      ),
    ),
    // USER limited view
    { moduleCode: 'ORDERS', tabCode: 'LIST', actionCode: 'VIEW', roleCode: 'USER' },
    { moduleCode: 'ANALYTICS', tabCode: 'DASHBOARD', actionCode: 'VIEW', roleCode: 'USER' },
  ];

  // Upsert roles
  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name },
      create: { code: role.code, name: role.name },
    });
  }

  // Upsert actions
  for (const action of actions) {
    await prisma.action.upsert({
      where: { code: action.code },
      update: { name: action.name },
      create: { code: action.code, name: action.name },
    });
  }

  // Upsert modules and tabs
  for (const mod of modules) {
    const moduleRecord = await prisma.module.upsert({
      where: { code: mod.code },
      update: { name: mod.name },
      create: {
        code: mod.code,
        name: mod.name,
      },
    });

    for (const tab of mod.tabs) {
      const existing = await prisma.tab.findFirst({
        where: { moduleId: moduleRecord.id, code: tab.code },
        select: { id: true },
      });
      if (existing) {
        await prisma.tab.update({
          where: { id: existing.id },
          data: { name: tab.name },
        });
        continue;
      }
      await prisma.tab.create({
        data: { code: tab.code, name: tab.name, moduleId: moduleRecord.id },
      });
    }
  }

  // Map codes to ids
  const roleMap = new Map(
    (await prisma.role.findMany({ select: { id: true, code: true } })).map((r) => [r.code, r.id]),
  );
  const actionMap = new Map(
    (await prisma.action.findMany({ select: { id: true, code: true } })).map((a) => [a.code, a.id]),
  );
  const moduleMap = new Map(
    (await prisma.module.findMany({ select: { id: true, code: true } })).map((m) => [m.code, m.id]),
  );
  const tabMap = new Map<
    string,
    { id: string; code: string; moduleId: string }
  >();
  const tabs = await prisma.tab.findMany({ select: { id: true, code: true, moduleId: true } });
  for (const t of tabs) {
    const moduleCode = Array.from(moduleMap.entries()).find(([, id]) => id === t.moduleId)?.[0];
    if (moduleCode) tabMap.set(`${moduleCode}:${t.code}`, t);
  }

  // Upsert accesses
  for (const entry of accessMatrix) {
    const moduleId = moduleMap.get(entry.moduleCode);
    const tab = tabMap.get(`${entry.moduleCode}:${entry.tabCode}`);
    const actionId = actionMap.get(entry.actionCode);
    const roleId = roleMap.get(entry.roleCode);
    if (!moduleId || !tab || !actionId || !roleId) continue;

    await prisma.access.upsert({
      where: {
        moduleId_tabId_actionId_roleId: {
          moduleId,
          tabId: tab.id,
          actionId,
          roleId,
        },
      },
      update: {},
      create: {
        moduleId,
        tabId: tab.id,
        actionId,
        roleId,
      },
    });
  }

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

