// CommonJS seed script to avoid ts-node/type resolution issues
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const roles = [
    { code: 'ADMIN', name: 'Administrator' },
    { code: 'USER', name: 'User' },
    { code: 'MODERATOR', name: 'Moderator' },
  ];

  const actions = [
    { code: 'VIEW', name: 'View' },
    { code: 'EDIT', name: 'Edit' },
    { code: 'DELETE', name: 'Delete' },
  ];

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
    {
      code: 'ACCESS',
      name: 'Access',
      tabs: [{ code: 'ROLEACCESS', name: 'Role Access' }],
    },
  ];

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

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name },
      create: { code: role.code, name: role.name },
    });
  }

  for (const action of actions) {
    await prisma.action.upsert({
      where: { code: action.code },
      update: { name: action.name },
      create: { code: action.code, name: action.name },
    });
  }

  for (const mod of modules) {
    const moduleRecord = await prisma.module.upsert({
      where: { code: mod.code },
      update: { name: mod.name },
      create: { code: mod.code, name: mod.name },
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
      } else {
        await prisma.tab.create({
          data: { code: tab.code, name: tab.name, moduleId: moduleRecord.id },
        });
      }
    }
  }

  const roleMap = new Map(
    (await prisma.role.findMany({ select: { id: true, code: true } })).map((r) => [r.code, r.id]),
  );
  const actionMap = new Map(
    (await prisma.action.findMany({ select: { id: true, code: true } })).map((a) => [a.code, a.id]),
  );
  const moduleMap = new Map(
    (await prisma.module.findMany({ select: { id: true, code: true } })).map((m) => [m.code, m.id]),
  );

  const tabs = await prisma.tab.findMany({ select: { id: true, code: true, moduleId: true } });
  const tabMap = new Map();
  for (const t of tabs) {
    const moduleCode = [...moduleMap.entries()].find(([, id]) => id === t.moduleId)?.[0];
    if (moduleCode) tabMap.set(`${moduleCode}:${t.code}`, t);
  }

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

  console.log('Seed completed (CJS)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

