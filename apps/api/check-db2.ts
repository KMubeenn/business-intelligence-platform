import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dataSources = await prisma.dataSource.findMany();
  console.log(JSON.stringify(dataSources.map(d => ({ name: d.name, type: d.type, config: d.configurationJson })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
