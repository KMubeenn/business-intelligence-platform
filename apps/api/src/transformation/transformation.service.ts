import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransformationService {
  private readonly logger = new Logger(TransformationService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron("*/5 * * * * *")
  async handleTransformation() {
    this.logger.log('Starting transformation sweep...');

    // Find all raw records that don't have a mapped canonical record
    const unmappedRecords = await this.prisma.rawRecord.findMany({
      where: {
        canonicalRecord: null,
      },
      include: {
        rawTable: {
          include: {
            fieldMappings: {
              include: {
                canonicalModel: true,
              },
            },
          },
        },
      },
      take: 2000, // Process in large batches
    });

    if (unmappedRecords.length === 0) {
      this.logger.debug('No unmapped records found.');
      return;
    }

    this.logger.log(`Found ${unmappedRecords.length} records to transform.`);

    for (const record of unmappedRecords) {
      const mappings = record.rawTable.fieldMappings;
      
      if (!mappings || mappings.length === 0) {
        // No mapping exists yet, maybe skip or mark as UNMAPPED
        continue;
      }

      // Assuming one mapping per table for now
      const mapping = mappings[0];
      const rules = mapping.mappingRules as Record<string, string>;
      const rawData = record.data as Record<string, any>;
      
      const canonicalData: Record<string, any> = {};
      let hasError = false;

      try {
        for (const [canonicalField, rawField] of Object.entries(rules)) {
          canonicalData[canonicalField] = rawData[rawField];
        }
      } catch (err) {
        this.logger.error(`Failed to apply mapping to record ${record.id}:`, err);
        hasError = true;
      }

      await this.prisma.canonicalRecord.create({
        data: {
          canonicalModelId: mapping.canonicalModelId,
          rawRecordId: record.id,
          data: canonicalData,
          status: hasError ? 'ERROR' : 'MAPPED',
        },
      });
    }
    
    this.logger.log(`Finished processing ${unmappedRecords.length} records.`);
  }
}
