import { Module } from '@nestjs/common';
import { AdHocReportsController } from './ad-hoc-reports.controller';
import { AdHocReportsService } from './ad-hoc-reports.service';
import { DocumentIngestionModule } from '../document-ingestion/document-ingestion.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DocumentIngestionModule, PrismaModule, StorageModule],
  controllers: [AdHocReportsController],
  providers: [AdHocReportsService],
})
export class AdHocReportsModule { }
