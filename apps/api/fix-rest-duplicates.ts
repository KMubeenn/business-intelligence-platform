import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up duplicate REST API records...');

  // Delete all raw records from the REST API tables
  const { count: rawCount } = await prisma.rawRecord.deleteMany({
    where: {
      rawTable: {
        dataSource: {
          type: 'REST_API'
        }
      }
    }
  });

  console.log(`Deleted ${rawCount} duplicate Raw Records.`);
  
  // Reset the lastSyncTimestamp so it triggers immediately on next sweep
  await prisma.rawTable.updateMany({
    where: {
      dataSource: {
        type: 'REST_API'
      }
    },
    data: {
      lastSyncTimestamp: null
    }
  });

  console.log('Reset lastSyncTimestamp. Background workers will now perform a clean sync!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
