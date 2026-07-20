import 'dotenv/config';
import { AdHocReportsService } from './ad-hoc-reports/ad-hoc-reports.service';
import { DocumentIngestionCoordinator } from './document-ingestion/document-ingestion.coordinator';
import { ExcelReader } from './document-ingestion/readers/excel/excel.reader';
import { DocumentAnalyzerService } from './document-ingestion/stages/stage2-document-analyzer.service';
import { LayoutSerializerService } from './document-ingestion/stages/stage3-layout-serializer.service';
import { AiExtractionService } from './document-ingestion/stages/stage4-ai-extraction.service';
import { ValidationEngineService } from './document-ingestion/stages/stage5-validation.service';
import { IngestionCacheService } from './document-ingestion/cache/ingestion-cache.service';
import * as fs from 'fs';
import * as path from 'path';

async function runAdHocTest() {
  const cache = new IngestionCacheService();
  const reader = new ExcelReader(cache);
  const analyzer = new DocumentAnalyzerService();
  const serializer = new LayoutSerializerService();
  const extractor = new AiExtractionService();
  const validator = new ValidationEngineService();

  const coordinator = new DocumentIngestionCoordinator(
    cache, reader, analyzer, serializer, extractor, validator
  );

  const adHocService = new AdHocReportsService(coordinator);

  const folderPath = path.resolve(__dirname, '../../../'); // c:\DevProjects\business-intelligence-platform\
  const userQuery = 'Combine these reports and generate a single executive summary covering all sales, inventory, and KPIs across the datasets.';

  console.log(`Running ad-hoc report for folder: ${folderPath}`);
  try {
    const pdfBase64 = await adHocService.generateFolderReportPdf([path.join(folderPath, '1.xls')], userQuery);
    
    const outputPath = path.join(__dirname, '../ad-hoc-report-output.pdf');
    fs.writeFileSync(outputPath, Buffer.from(pdfBase64, 'base64'));
    
    console.log(`\n✅ Ad-Hoc Report generated successfully!`);
    console.log(`Saved to: ${outputPath}`);
  } catch (err) {
    console.error('\n❌ Ad-Hoc Report failed:', err);
  }
}

runAdHocTest();
