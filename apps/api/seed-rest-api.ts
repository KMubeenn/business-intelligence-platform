import { PrismaClient, DataSourceType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) throw new Error('No organization found');

  console.log(`Seeding REST API data source for org: ${org.id}`);

  // 1. Create Data Source
  const dataSource = await prisma.dataSource.create({
    data: {
      organizationId: org.id,
      name: 'Global SaaS Store',
      type: DataSourceType.REST_API,
      configurationJson: {
        baseUrl: 'http://localhost:3001/external-api/mock-store',
        endpoints: [
          {
            name: 'users',
            path: '/users',
            method: 'GET',
            pagination: { type: 'page', paramName: 'page' },
          },
          {
            name: 'inventory',
            path: '/inventory',
            method: 'GET',
            pagination: { type: 'page', paramName: 'page' },
          },
        ],
      },
    },
  });

  console.log(`Created REST API DataSource: ${dataSource.id}`);

  // 2. Create Raw Tables
  const usersRawTable = await prisma.rawTable.create({
    data: {
      dataSourceId: dataSource.id,
      tableName: 'users',
      syncEnabled: true,
      incrementalColumn: null, // REST API will pull all pages
    },
  });

  const inventoryRawTable = await prisma.rawTable.create({
    data: {
      dataSourceId: dataSource.id,
      tableName: 'inventory',
      syncEnabled: true,
      incrementalColumn: null,
    },
  });

  console.log('Created raw tables: users, inventory');

  // 3. Create Canonical Models
  const usersCanonicalModel = await prisma.canonicalModel.create({
    data: {
      organizationId: org.id,
      name: 'Users',
      schemaJson: [
        { name: 'userId', type: 'string' },
        { name: 'firstName', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'registeredAt', type: 'date' },
      ],
    },
  });

  const inventoryCanonicalModel = await prisma.canonicalModel.create({
    data: {
      organizationId: org.id,
      name: 'Inventory',
      schemaJson: [
        { name: 'sku', type: 'string' },
        { name: 'productName', type: 'string' },
        { name: 'category', type: 'string' },
        { name: 'stockCount', type: 'number' },
        { name: 'price', type: 'number' },
      ],
    },
  });

  console.log('Created Canonical Models: Users, Inventory');

  // 4. Create Field Mappings
  await prisma.fieldMapping.create({
    data: {
      canonicalModelId: usersCanonicalModel.id,
      rawTableId: usersRawTable.id,
      mappingRules: {
        userId: 'id',
        firstName: 'first_name',
        email: 'email',
        status: 'status',
        registeredAt: 'registered_at',
      },
    },
  });

  await prisma.fieldMapping.create({
    data: {
      canonicalModelId: inventoryCanonicalModel.id,
      rawTableId: inventoryRawTable.id,
      mappingRules: {
        sku: 'sku',
        productName: 'product_name',
        category: 'category',
        stockCount: 'stock_count',
        price: 'price',
      },
    },
  });

  console.log('Successfully mapped REST API responses to Canonical Models!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
