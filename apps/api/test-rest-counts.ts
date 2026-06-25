import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rawUsers = await prisma.rawRecord.count({
    where: { rawTable: { tableName: 'users', dataSource: { type: 'REST_API' } } },
  });
  
  const rawInventory = await prisma.rawRecord.count({
    where: { rawTable: { tableName: 'inventory', dataSource: { type: 'REST_API' } } },
  });

  const canonicalUsers = await prisma.canonicalRecord.count({
    where: { canonicalModel: { name: 'Users' }, status: 'MAPPED' },
  });

  const canonicalInventory = await prisma.canonicalRecord.count({
    where: { canonicalModel: { name: 'Inventory' }, status: 'MAPPED' },
  });

  console.log(`Raw Users: ${rawUsers}`);
  console.log(`Raw Inventory: ${rawInventory}`);
  console.log(`Canonical Users: ${canonicalUsers}`);
  console.log(`Canonical Inventory: ${canonicalInventory}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
