import { Injectable, Logger } from '@nestjs/common';
import { ExcelReader } from './readers/excel/excel.reader';
import { DocumentAnalyzerService } from './stages/stage2-document-analyzer.service';
import { LayoutSerializerService } from './stages/stage3-layout-serializer.service';
import { AiExtractionService } from './stages/stage4-ai-extraction.service';
import { ValidationEngineService } from './stages/stage5-validation.service';
import { UniversalDataset } from './models/universal-dataset.model';
import { IngestionCacheService } from './cache/ingestion-cache.service';
import * as crypto from 'crypto';

@Injectable()
export class DocumentIngestionCoordinator {
  private readonly logger = new Logger(DocumentIngestionCoordinator.name);

  constructor(
    private readonly cacheService: IngestionCacheService,
    private readonly excelReader: ExcelReader,
    private readonly analyzer: DocumentAnalyzerService,
    private readonly serializer: LayoutSerializerService,
    private readonly aiExtractor: AiExtractionService,
    private readonly validator: ValidationEngineService
  ) {}

  async processDocument(filePath: string): Promise<UniversalDataset[]> {
    this.logger.log(`Starting document ingestion for ${filePath}`);

    // Stage 1: Reader
    const workbook = await this.excelReader.read(filePath);
    
    // Cache Check
    const cached = this.cacheService.getCachedDatasets(workbook.hash);
    if (cached) {
      this.logger.log(`Cache hit for ${filePath}`);
      return cached;
    }

    // Stage 2: Analyzer
    const regions = this.analyzer.analyze(workbook);
    this.logger.log(`Detected ${regions.length} logical regions`);

    const datasets: UniversalDataset[] = [];

    for (const region of regions) {
      // Stage 3: Serializer
      const layout = this.serializer.serialize(region, workbook);

      // Stage 4: AI Extraction
      const extracted = await this.aiExtractor.extract(layout);

      // Stage 5: Validation
      const validationResult = await this.validator.validate(extracted);

      if (!validationResult.isValid) {
        this.logger.warn(`Validation failed for region in ${filePath}. Warnings: ${validationResult.warnings.join(', ')}`);
        throw new Error(`Dataset validation failed: ${validationResult.warnings.join(', ')}`);
      }

      // Stage 6: Universal Dataset Generation
      const datasetId = crypto.randomUUID();
      const universalDataset: UniversalDataset = {
        datasetId,
        source: 'excel', // dynamically determined eventually
        sourceFile: filePath.split('/').pop() || filePath,
        sheet: region.sheetName,
        datasetName: extracted.datasetName,
        schema: {
          columns: extracted.columns.map(c => ({
            name: c.name,
            normalizedName: c.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            type: c.type,
            primaryDimension: c.primaryDimension
          }))
        },
        rows: extracted.rows,
        metadata: {
          notes: extracted.metadata?.notes || []
        },
        quality: {
          warnings: validationResult.warnings,
          correctionsApplied: validationResult.correctionsApplied
        },
        confidence: validationResult.finalConfidence
      };

      datasets.push(universalDataset);
    }

    // Cache Save
    this.cacheService.setCachedDatasets(workbook.hash, datasets);

    this.logger.log(`Successfully ingested ${datasets.length} universal datasets`);
    return datasets;
  }
}
