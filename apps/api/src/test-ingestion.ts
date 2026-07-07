import 'dotenv/config';
import { DocumentIngestionCoordinator } from './document-ingestion/document-ingestion.coordinator';
import { ExcelReader } from './document-ingestion/readers/excel/excel.reader';
import { DocumentAnalyzerService } from './document-ingestion/stages/stage2-document-analyzer.service';
import { LayoutSerializerService } from './document-ingestion/stages/stage3-layout-serializer.service';
import { AiExtractionService } from './document-ingestion/stages/stage4-ai-extraction.service';
import { ValidationEngineService } from './document-ingestion/stages/stage5-validation.service';
import { IngestionCacheService } from './document-ingestion/cache/ingestion-cache.service';

import * as fs from 'fs';

async function runTest() {
  const cache = new IngestionCacheService();
  const reader = new ExcelReader(cache);
  const analyzer = new DocumentAnalyzerService();
  const serializer = new LayoutSerializerService();
  const extractor = new AiExtractionService();
  const validator = new ValidationEngineService();

  const coordinator = new DocumentIngestionCoordinator(
    cache, reader, analyzer, serializer, extractor, validator
  );

  console.log('Testing with 1.xls... (This might take 30-60 seconds depending on the Gemini API response)');
  try {
    const result = await coordinator.processDocument('../../7.xls');

    // Save to file for easy viewing
    const outputPath = './ingestion-output.json';
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`\n✅ Test completed successfully!`);
    console.log(`Extracted ${result.length} datasets.`);
    console.log(`Result saved to: ${outputPath}`);
  } catch (err) {
    console.error('\n❌ Test failed:', err);
  }
}

runTest();
