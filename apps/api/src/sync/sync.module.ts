import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { ConnectorsModule } from '../connectors/connectors.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [ConnectorsModule, PrismaModule],
  providers: [SyncService],
})
export class SyncModule {}
