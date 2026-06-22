import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectorFactory } from '../connectors/connector.factory';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorFactory: ConnectorFactory,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleSync() {
    this.logger.log('Starting ingestion sync...');

    const tablesToSync = await this.prisma.rawTable.findMany({
      where: { syncEnabled: true },
      include: { dataSource: true },
    });

    for (const rawTable of tablesToSync) {
      try {
        const connector = this.connectorFactory.getConnector(
          rawTable.dataSource.type,
          rawTable.dataSource.configurationJson,
        );

        const rows = await connector.sync(
          rawTable.tableName,
          rawTable.incrementalColumn,
          rawTable.lastSyncTimestamp,
        );

        if (rows.length > 0) {
          await this.prisma.rawRecord.createMany({
            data: rows.map(row => ({
              rawTableId: rawTable.id,
              data: row as any,
            })),
          });

          await this.prisma.rawTable.update({
            where: { id: rawTable.id },
            data: { lastSyncTimestamp: new Date() },
          });

          this.logger.log(`Synced ${rows.length} rows for table ${rawTable.tableName}`);
        } else {
          this.logger.debug(`No new rows for table ${rawTable.tableName}`);
        }
      } catch (error) {
        this.logger.error(`Error syncing table ${rawTable.tableName}:`, error);
      }
    }
  }
}
