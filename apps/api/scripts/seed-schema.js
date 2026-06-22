const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const model = await prisma.canonicalModel.findFirst({ where: { name: 'Order' } });
  if (model) {
    await prisma.canonicalModel.update({
      where: { id: model.id },
      data: {
        schemaJson: [
          { name: "orderId", type: "string" },
          { name: "customer", type: "string" },
          { name: "total", type: "number" }
        ]
      }
    });
    console.log("Seeded Order schemaJson successfully!");
  } else {
    console.log("Order canonical model not found.");
  }
}

run().catch(console.error);
