import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { DataSourceModule } from './data-source/data-source.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { SyncModule } from './sync/sync.module';

import { TransformationModule } from './transformation/transformation.module';
import { CanonicalModelModule } from './canonical-model/canonical-model.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MockApiModule } from './mock-api/mock-api.module';

import { BullModule } from '@nestjs/bullmq';

import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    ScheduleModule.forRoot(), PrismaModule, AuthModule, DataSourceModule, ConnectorsModule, SyncModule, TransformationModule, CanonicalModelModule, AnalyticsModule, MockApiModule, ReportsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
