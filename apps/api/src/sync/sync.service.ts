import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('sync') private syncQueue: Queue
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleSync() {
    this.logger.debug('Sweeping for tables to sync...');

    const tablesToSync = await this.prisma.rawTable.findMany({
      where: { syncEnabled: true },
      select: { id: true, tableName: true, incrementalColumn: true, lastSyncTimestamp: true },
    });

    for (const rawTable of tablesToSync) {
      // Throttle full syncs (no incremental column) to once per hour
      if (!rawTable.incrementalColumn && rawTable.lastSyncTimestamp) {
        const timeSinceLastSync = new Date().getTime() - rawTable.lastSyncTimestamp.getTime();
        if (timeSinceLastSync < 3600000) {
          continue;
        }
      }

      // Add a job for each table to be processed asynchronously
      await this.syncQueue.add('sync-table', {
        rawTableId: rawTable.id,
      }, {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      });
      this.logger.debug(`Queued sync job for table ${rawTable.tableName}`);
    }
  }
}
