import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectorFactory } from '../connectors/connector.factory';

@Processor('sync')
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorFactory: ConnectorFactory,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { rawTableId } = job.data;

    const rawTable = await this.prisma.rawTable.findUnique({
      where: { id: rawTableId },
      include: { dataSource: true },
    });

    if (!rawTable) {
      throw new Error(`Raw table ${rawTableId} not found`);
    }

    try {
      this.logger.log(`Processing sync for table ${rawTable.tableName}...`);
      
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
        if (!rawTable.incrementalColumn && !rawTable.primaryKeyColumn) {
          this.logger.debug(`Wiping existing records for full sync of ${rawTable.tableName}...`);
          await this.prisma.rawRecord.deleteMany({
            where: { rawTableId: rawTable.id },
          });
        }

        // The Upsert Engine
        for (const row of rows) {
          const rowData = row as any;
          // Determine the externalId based on primaryKeyColumn, default to null if not provided
          let extId: string | null = null;
          if (rawTable.primaryKeyColumn && rowData[rawTable.primaryKeyColumn] !== undefined) {
            extId = String(rowData[rawTable.primaryKeyColumn]);
          }

          if (extId) {
            // Use Upsert to prevent duplicates and intelligently update existing records
            await this.prisma.rawRecord.upsert({
              where: {
                rawTableId_externalId: {
                  rawTableId: rawTable.id,
                  externalId: extId,
                }
              },
              update: {
                data: rowData,
              },
              create: {
                rawTableId: rawTable.id,
                externalId: extId,
                data: rowData,
              }
            });
          } else {
            // Fallback to generic insert if no primary key is defined
            await this.prisma.rawRecord.create({
              data: {
                rawTableId: rawTable.id,
                externalId: null,
                data: rowData,
              }
            });
          }
        }

        await this.prisma.rawTable.update({
          where: { id: rawTable.id },
          data: { lastSyncTimestamp: new Date() },
        });

        this.logger.log(`Successfully synced ${rows.length} rows for table ${rawTable.tableName}`);
      } else {
        this.logger.debug(`No new rows for table ${rawTable.tableName}`);
      }
    } catch (error) {
      this.logger.error(`Error syncing table ${rawTable.tableName}:`, error);
      throw error; // Let BullMQ catch it and retry or send to DLQ
    }
  }
}
