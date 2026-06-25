import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ConnectorHealth {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'idle' | 'no_data';
  tableCount: number;
  totalRecords: number;
  lastSyncAt: Date | null;
}

export interface TableHealth {
  id: string;
  tableName: string;
  recordCount: number;
  lastSyncAt: Date | null;
  primaryKeyColumn: string | null;
  incrementalColumn: string | null;
  mappedTo: string | null; // canonical model name
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getAggregatedData(
    organizationId: string,
    canonicalModelId: string,
    groupBy?: string,
    metricField?: string,
    metricType?: 'sum' | 'count' | 'avg'
  ) {
    // Verify the model belongs to the organization
    const model = await this.prisma.canonicalModel.findFirst({
      where: { id: canonicalModelId, organizationId }
    });

    if (!model) {
      throw new BadRequestException('Canonical model not found');
    }

    // If no groupBy or metric is provided, return a quick count or the top 100 rows for preview
    if (!groupBy || !metricField) {
      const records = await this.prisma.canonicalRecord.findMany({
        where: { canonicalModelId, status: 'MAPPED' },
        take: 5000,
        orderBy: { createdAt: 'desc' },
        include: {
          rawRecord: {
            include: {
              rawTable: {
                include: {
                  dataSource: true
                }
              }
            }
          }
        }
      });
      return { 
        type: 'raw', 
        data: records.map(r => ({ 
          ...r.data as any, 
          _source: r.rawRecord?.rawTable?.dataSource?.name || 'Unknown',
          _timestamp: r.createdAt 
        })) 
      };
    }

    // Protect against SQL injection by validating fields against the schema definition
    const schema = model.schemaJson as any[] || [];
    const validFields = schema.map(f => f.name);

    if (!validFields.includes(groupBy) && groupBy !== '_createdAt') {
      throw new BadRequestException(`Invalid groupBy field: ${groupBy}`);
    }
    if (!validFields.includes(metricField) && metricField !== '*') {
      throw new BadRequestException(`Invalid metric field: ${metricField}`);
    }

    try {
      // Dynamic PostgreSQL JSON Aggregation
      let query = '';
      if (metricType === 'count') {
        query = `
          SELECT 
            data->>'${groupBy}' as category,
            COUNT(*) as value
          FROM "CanonicalRecord"
          WHERE "canonicalModelId" = '${canonicalModelId}' AND status = 'MAPPED'
          GROUP BY data->>'${groupBy}'
          ORDER BY value DESC
        `;
      } else if (metricType === 'sum') {
        query = `
          SELECT 
            data->>'${groupBy}' as category,
            SUM(CAST(data->>'${metricField}' AS NUMERIC)) as value
          FROM "CanonicalRecord"
          WHERE "canonicalModelId" = '${canonicalModelId}' AND status = 'MAPPED'
            AND data->>'${metricField}' IS NOT NULL
          GROUP BY data->>'${groupBy}'
          ORDER BY value DESC
        `;
      } else {
        throw new BadRequestException('Unsupported metric type');
      }

      // Execute raw query
      const result = await this.prisma.$queryRawUnsafe(query);
      
      // Convert BigInts from COUNT/SUM to regular numbers for JSON serialization
      const formattedResult = (result as any[]).map(row => ({
        category: row.category || 'Unknown',
        value: typeof row.value === 'bigint' ? Number(row.value) : Number(row.value) || 0
      }));

      return { type: 'aggregated', data: formattedResult };
    } catch (err) {
      console.error('Analytics aggregation error:', err);
      throw new BadRequestException('Failed to compute analytics for requested fields');
    }
  }

  async getOverallMetrics(organizationId: string) {
    const totalSources = await this.prisma.dataSource.count({ where: { organizationId }});
    const models = await this.prisma.canonicalModel.findMany({
      where: { organizationId },
      include: {
        _count: { select: { records: true } }
      }
    });

    const totalRecords = models.reduce((acc, m) => acc + m._count.records, 0);

    return {
      totalSources,
      totalModels: models.length,
      totalNormalizedRecords: totalRecords,
      modelsBreakdown: models.map(m => ({ name: m.name, records: m._count.records })),
    };
  }

  async getPipelineOverview(organizationId: string) {
    const dataSources = await this.prisma.dataSource.findMany({
      where: { organizationId },
      include: {
        rawTables: {
          where: { syncEnabled: true },
          include: {
            _count: { select: { records: true } },
            fieldMappings: {
              include: { canonicalModel: { select: { name: true } } }
            }
          }
        }
      }
    });

    const connectors: ConnectorHealth[] = dataSources.map(ds => {
      const tables = ds.rawTables;
      const totalRecords = tables.reduce((acc, t) => acc + t._count.records, 0);
      const lastSync = tables
        .map(t => t.lastSyncTimestamp)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null;

      const minutesSinceSync = lastSync
        ? (Date.now() - new Date(lastSync).getTime()) / 60000
        : null;

      let status: ConnectorHealth['status'] = 'no_data';
      if (totalRecords > 0) {
        status = minutesSinceSync !== null && minutesSinceSync < 120 ? 'healthy' : 'idle';
      }

      return {
        id: ds.id,
        name: ds.name,
        type: ds.type,
        status,
        tableCount: tables.length,
        totalRecords,
        lastSyncAt: lastSync,
      };
    });

    // Hourly sync volume for the last 24h — group RawRecord createdAt by hour
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const hourlyRows = await this.prisma.$queryRaw<{ hour: string; source: string; count: bigint }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('hour', rr."createdAt"), 'HH24:00') AS hour,
        ds."name" AS source,
        COUNT(*) AS count
      FROM "RawRecord" rr
      JOIN "RawTable" rt ON rr."rawTableId" = rt.id
      JOIN "DataSource" ds ON rt."dataSourceId" = ds.id
      WHERE rr."createdAt" >= ${since24h}
        AND ds."organizationId" = ${organizationId}
      GROUP BY DATE_TRUNC('hour', rr."createdAt"), ds."name"
      ORDER BY DATE_TRUNC('hour', rr."createdAt") ASC
    `;

    // Pivot hourly rows into [{hour, Source1: N, Source2: M, ...}]
    const hourMap: Record<string, Record<string, number | string>> = {};
    for (const row of hourlyRows) {
      if (!hourMap[row.hour]) hourMap[row.hour] = { hour: row.hour };
      hourMap[row.hour][row.source] = Number(row.count);
    }
    const syncActivity = Object.values(hourMap);
    const sourceNames = [...new Set(hourlyRows.map(r => r.source))];

    const totalSynced24h = hourlyRows.reduce((acc, r) => acc + Number(r.count), 0);

    return { connectors, syncActivity, sourceNames, totalSynced24h };
  }

  async getSourceDetail(organizationId: string, sourceId: string) {
    const ds = await this.prisma.dataSource.findFirst({
      where: { id: sourceId, organizationId },
      include: {
        rawTables: {
          include: {
            _count: { select: { records: true } },
            fieldMappings: {
              include: { canonicalModel: { select: { name: true } } }
            }
          }
        }
      }
    });

    if (!ds) throw new BadRequestException('Data source not found');

    const tables: TableHealth[] = ds.rawTables.map(t => ({
      id: t.id,
      tableName: t.tableName,
      recordCount: t._count.records,
      lastSyncAt: t.lastSyncTimestamp,
      primaryKeyColumn: t.primaryKeyColumn,
      incrementalColumn: t.incrementalColumn,
      mappedTo: t.fieldMappings[0]?.canonicalModel?.name || null,
    }));

    return {
      id: ds.id,
      name: ds.name,
      type: ds.type,
      tables,
    };
  }

  async getExplorerData(
    organizationId: string,
    canonicalModelId: string,
    page: number = 1,
    pageSize: number = 50,
    sourceFilter?: string,
  ) {
    const model = await this.prisma.canonicalModel.findFirst({
      where: { id: canonicalModelId, organizationId }
    });
    if (!model) throw new BadRequestException('Model not found');

    const where: any = { canonicalModelId, status: 'MAPPED' };
    if (sourceFilter) {
      where.rawRecord = {
        rawTable: {
          dataSource: { name: sourceFilter }
        }
      };
    }

    const [records, total] = await Promise.all([
      this.prisma.canonicalRecord.findMany({
        where,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { rawRecord: { rawTable: { dataSource: { name: 'asc' } } } },
        include: {
          rawRecord: {
            include: {
              rawTable: { include: { dataSource: { select: { name: true } } } }
            }
          }
        }
      }),
      this.prisma.canonicalRecord.count({ where })
    ]);

    return {
      records: records.map(r => ({
        ...(r.data as any),
        _source: r.rawRecord?.rawTable?.dataSource?.name || 'Unknown',
        _syncedAt: r.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
