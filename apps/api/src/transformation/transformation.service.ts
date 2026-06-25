import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class TransformationService {
  private readonly logger = new Logger(TransformationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('transform') private transformQueue: Queue
  ) {}

  @Cron("*/5 * * * * *")
  async handleTransformation() {
    this.logger.log('Sweeping for unmapped records to transform...');

    // Find all raw records that don't have a mapped canonical record
    const unmappedRecords = await this.prisma.rawRecord.findMany({
      where: { canonicalRecord: null },
      select: { id: true },
      take: 2000, // Push 2000 jobs max per sweep
    });

    if (unmappedRecords.length === 0) {
      this.logger.debug('No unmapped records found.');
      return;
    }

    this.logger.log(`Queueing ${unmappedRecords.length} records to transform.`);

    // Add them to the queue efficiently
    // BullMQ supports bulk adding
    const jobs = unmappedRecords.map(record => ({
      name: 'transform-record',
      data: { rawRecordId: record.id },
      opts: { 
        removeOnComplete: true, 
        removeOnFail: false,
        attempts: 2
      }
    }));

    await this.transformQueue.addBulk(jobs);
    this.logger.log(`Queued ${jobs.length} transformation jobs.`);
  }
}
