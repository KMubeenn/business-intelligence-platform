import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all Normalized Data...");
  await prisma.canonicalRecord.deleteMany();
  
  console.log("Clearing all Raw Records...");
  await prisma.rawRecord.deleteMany();

  console.log("Resetting lastSyncTimestamp for all RawTables...");
  await prisma.rawTable.updateMany({
    data: { lastSyncTimestamp: null }
  });

  console.log("Reset complete! The Sync Engine will now pull all new fake orders within the next 30 seconds.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
