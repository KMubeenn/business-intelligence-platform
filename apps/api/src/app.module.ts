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

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AuthModule, DataSourceModule, ConnectorsModule, SyncModule, TransformationModule, CanonicalModelModule, AnalyticsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
