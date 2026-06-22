const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log("🚀 Setting up Restaurant Data Sources...");

  const org = await prisma.organization.findFirst();
  const canonicalModel = await prisma.canonicalModel.findFirst({ where: { name: 'Order' } });

  const restaurants = [
    { name: "Bob's Burgers", db: "bobs_burgers", rules: { "orderId": "id", "customer": "customer_name", "total": "burger_cost" } },
    { name: "Pizza Planet", db: "pizza_planet", rules: { "orderId": "order_id", "customer": "buyer", "total": "amount" } },
    { name: "Sushi Station", db: "sushi_station", rules: { "orderId": "uid", "customer": "client_name", "total": "total_price" } }
  ];

  for (const r of restaurants) {
    console.log(`Configuring ${r.name}...`);
    // 1. Create DataSource
    const ds = await prisma.dataSource.create({
      data: {
        organizationId: org.id,
        name: r.name,
        type: 'MYSQL',
        configurationJson: {
          host: "localhost",
          port: 3306,
          user: "root",
          password: "password",
          database: r.db
        }
      }
    });

    // 2. Insert RawTable manually for speed
    const rawTable = await prisma.rawTable.create({
      data: {
        dataSourceId: ds.id,
        tableName: "orders",
        syncEnabled: true
      }
    });

    // 3. Insert Field Mapping
    await prisma.fieldMapping.create({
      data: {
        canonicalModelId: canonicalModel.id,
        rawTableId: rawTable.id,
        mappingRules: r.rules
      }
    });

    console.log(`✅ ${r.name} configured with sync and mapping rules!`);
  }
}

run().catch(console.error);
