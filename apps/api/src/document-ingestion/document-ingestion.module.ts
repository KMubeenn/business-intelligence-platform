import { Module } from '@nestjs/common';
import { DocumentIngestionCoordinator } from './document-ingestion.coordinator';
import { ExcelReader } from './readers/excel/excel.reader';
import { DocumentAnalyzerService } from './stages/stage2-document-analyzer.service';
import { LayoutSerializerService } from './stages/stage3-layout-serializer.service';
import { AiExtractionService } from './stages/stage4-ai-extraction.service';
import { ValidationEngineService } from './stages/stage5-validation.service';
import { IngestionCacheService } from './cache/ingestion-cache.service';

@Module({
  providers: [
    DocumentIngestionCoordinator,
    ExcelReader,
    DocumentAnalyzerService,
    LayoutSerializerService,
    AiExtractionService,
    ValidationEngineService,
    IngestionCacheService
  ],
  exports: [
    DocumentIngestionCoordinator
  ]
})
export class DocumentIngestionModule {}
