import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check canonical records per source per model
  console.log('\n=== CANONICAL RECORDS PER SOURCE ===');
  const canonical = await prisma.canonicalRecord.findMany({
    include: {
      canonicalModel: { select: { name: true } },
      rawRecord: {
        include: {
          rawTable: {
            include: { dataSource: { select: { name: true } } }
          }
        }
      }
    },
    take: 5000,
  });

  const breakdown: Record<string, Record<string, number>> = {};
  for (const r of canonical) {
    const model = r.canonicalModel.name;
    const source = r.rawRecord?.rawTable?.dataSource?.name || 'Unknown';
    if (!breakdown[model]) breakdown[model] = {};
    breakdown[model][source] = (breakdown[model][source] || 0) + 1;
  }
  for (const [model, sources] of Object.entries(breakdown)) {
    console.log(`\n  Model: ${model}`);
    for (const [src, cnt] of Object.entries(sources)) {
      console.log(`    - ${src}: ${cnt} records`);
    }
  }

  // Check RawRecords per table  
  console.log('\n=== RAW RECORDS PER TABLE/SOURCE ===');
  const rawTables = await prisma.rawTable.findMany({
    include: {
      dataSource: { select: { name: true } },
      _count: { select: { records: true } },
      fieldMappings: { include: { canonicalModel: { select: { name: true } } } }
    }
  });
  for (const t of rawTables) {
    const mapping = t.fieldMappings[0]?.canonicalModel?.name || 'NOT MAPPED';
    console.log(`  ${t.dataSource.name} / ${t.tableName}: ${t._count.records} raw records → ${mapping}`);
  }

  // Check RawRecords in last 24h
  console.log('\n=== RAW RECORDS IN LAST 24H ===');
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await prisma.rawRecord.count({
    where: { createdAt: { gte: since } }
  });
  const allCount = await prisma.rawRecord.count();
  console.log(`  Total raw records: ${allCount}`);
  console.log(`  Created in last 24h: ${recentCount}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
