import { Module } from '@nestjs/common';
import { AdHocReportsController } from './ad-hoc-reports.controller';
import { AdHocReportsService } from './ad-hoc-reports.service';
import { DocumentIngestionModule } from '../document-ingestion/document-ingestion.module';

@Module({
  imports: [DocumentIngestionModule],
  controllers: [AdHocReportsController],
  providers: [AdHocReportsService],
})
export class AdHocReportsModule {}
