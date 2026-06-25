import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SyncService } from './sync.service';
import { SyncProcessor } from './sync.processor';
import { ConnectorsModule } from '../connectors/connectors.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConnectorsModule, 
    PrismaModule,
    BullModule.registerQueue({
      name: 'sync',
    })
  ],
  providers: [SyncService, SyncProcessor],
})
export class SyncModule {}
