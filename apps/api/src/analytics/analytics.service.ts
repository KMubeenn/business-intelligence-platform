import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
          _source: r.rawRecord?.rawTable?.dataSource?.name || 'Unknown' 
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
    // Quick summary of all data
    const totalSources = await this.prisma.dataSource.count({ where: { organizationId }});
    const models = await this.prisma.canonicalModel.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { records: true }
        }
      }
    });

    const totalRecords = models.reduce((acc, m) => acc + m._count.records, 0);

    return {
      totalSources,
      totalModels: models.length,
      totalNormalizedRecords: totalRecords
    };
  }
}
