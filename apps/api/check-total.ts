import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const dataSources = await prisma.dataSource.findMany({ include: { rawTables: { include: { _count: { select: { records: true } } } } } });
  for (const ds of dataSources) {
    const total = ds.rawTables.reduce((acc, t) => acc + t._count.records, 0);
    console.log(ds.name + ': ' + total);
  }
  await prisma.$disconnect();
}
run();
