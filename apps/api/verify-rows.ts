import { PrismaClient } from '@prisma/client';
import * as mysql from 'mysql2/promise';

async function check() {
  const prisma = new PrismaClient();
  const dataSources = await prisma.dataSource.findMany({ include: { rawTables: true } });
  
  for (const ds of dataSources) {
    if (ds.type === 'MYSQL') {
      const config = ds.configurationJson as any;
      console.log(`\n--- Data Source: ${ds.name} (${config.database}) ---`);
      
      try {
        const conn = await mysql.createConnection({
          host: config.host,
          port: config.port || 3306,
          user: config.user,
          password: config.password,
          database: config.database
        });
        
        const [tables]: any = await conn.query('SHOW TABLES');
        
        for (const t of tables) {
          const tableName = Object.values(t)[0] as string;
          const [mysqlRows]: any = await conn.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
          const mysqlCount = mysqlRows[0].count;
          
          const rawTable = ds.rawTables.find((rt: any) => rt.tableName === tableName);
          let pgCount = 0;
          if (rawTable) {
            pgCount = await prisma.rawRecord.count({
              where: {
                rawTableId: rawTable.id
              }
            });
          }
          
          console.log(`Table: ${tableName}`);
          console.log(`  MySQL Rows: ${mysqlCount}`);
          console.log(`  Postgres RawRecords: ${pgCount}`);
          if (mysqlCount === pgCount) {
            console.log(`  MATCH: ✅`);
          } else {
            console.log(`  MISMATCH: ❌`);
          }
        }
        await conn.end();
      } catch (err: any) {
        console.error(`Error connecting to MySQL for ${ds.name}:`, err.message);
      }
    }
  }
  await prisma.$disconnect();
}
check().catch(console.error);
