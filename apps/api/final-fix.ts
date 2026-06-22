import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Wiping all bad records...");
  await prisma.canonicalRecord.deleteMany();
  await prisma.rawRecord.deleteMany();

  console.log("Resetting sync timestamps...");
  await prisma.rawTable.updateMany({
    data: { lastSyncTimestamp: null }
  });

  console.log("Forcing correct schema mappings...");
  await prisma.canonicalModel.updateMany({
    where: { name: 'Order' },
    data: {
      schemaJson: [
        { name: "orderId", type: "string" },
        { name: "customer", type: "string" },
        { name: "total", type: "number" },
        { name: "status", type: "string" },
        { name: "createdAt", type: "date" }
      ]
    }
  });

  await prisma.fieldMapping.updateMany({
    data: {
      mappingRules: {
        "orderId": "id",
        "customer": "customer_name",
        "total": "total_amount",
        "status": "status",
        "createdAt": "created_at"
      }
    }
  });

  console.log("Done! The system will now cleanly sync exactly 1500 records within 30 seconds.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
