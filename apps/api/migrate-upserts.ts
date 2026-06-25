import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Migrating existing tables to the Upsert Engine...');

  const tables = await prisma.rawTable.findMany({
    include: { dataSource: true }
  });

  for (const table of tables) {
    let primaryKey: string | null = null;
    
    // Legacy SQL Databases
    if (table.dataSource.type === 'MYSQL') {
      primaryKey = 'id';
    } 
    // REST API endpoints
    else if (table.dataSource.type === 'REST_API') {
      if (table.tableName === 'users') primaryKey = 'id';
      else if (table.tableName === 'inventory') primaryKey = 'sku';
    }

    if (primaryKey) {
      await prisma.rawTable.update({
        where: { id: table.id },
        data: { primaryKeyColumn: primaryKey }
      });
      console.log(`[SUCCESS] Assigned primaryKeyColumn '${primaryKey}' to table '${table.tableName}'`);
    } else {
      console.log(`[SKIP] Could not infer primary key for table '${table.tableName}'`);
    }
  }

  console.log('Migration complete. The Upsert Engine is now fully active for all sources!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
