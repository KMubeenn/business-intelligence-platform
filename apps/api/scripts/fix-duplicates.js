const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("🧹 Cleaning up duplicated dummy data...");

  // Delete all Canonical and Raw records to get a clean slate
  await prisma.canonicalRecord.deleteMany();
  await prisma.rawRecord.deleteMany();
  
  console.log("✅ Wiped existing records. Resetting sync pointers...");

  // Get the 3 dummy tables and assign their incremental columns
  const rawTables = await prisma.rawTable.findMany({
    include: { dataSource: true }
  });

  for (const table of rawTables) {
    let incCol = null;
    if (table.dataSource.name === "Bob's Burgers") incCol = "date";
    if (table.dataSource.name === "Pizza Planet") incCol = "created_at";
    if (table.dataSource.name === "Sushi Station") incCol = "timestamp";

    if (incCol) {
      await prisma.rawTable.update({
        where: { id: table.id },
        data: { 
          incrementalColumn: incCol,
          lastSyncTimestamp: null // reset pointer so it does one full pull
        }
      });
      console.log(`Set incremental column for ${table.dataSource.name} to '${incCol}'`);
    }
  }

  console.log("🎉 Cleanup complete! Next sync will pull exactly 1 copy of the data and never duplicate.");
}

run().catch(console.error);
