import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('transform')
export class TransformationProcessor extends WorkerHost {
  private readonly logger = new Logger(TransformationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { rawRecordId } = job.data;

    const record = await this.prisma.rawRecord.findUnique({
      where: { id: rawRecordId },
      include: {
        rawTable: {
          include: {
            fieldMappings: true,
          },
        },
      },
    });

    if (!record) {
      this.logger.warn(`Raw record ${rawRecordId} not found, skipping.`);
      return;
    }

    const mappings = record.rawTable.fieldMappings;
    
    if (!mappings || mappings.length === 0) {
      // Cannot process without mappings
      throw new Error(`No mappings exist for table ${record.rawTableId}`);
    }

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
    
    this.logger.debug(`Transformed record ${record.id}`);
  }
}
