import { Injectable, Logger } from '@nestjs/common';
import { generateWithFallbacks } from '../utils/ai-generator.util';
import { DocumentIngestionCoordinator } from '../document-ingestion/document-ingestion.coordinator';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { UniversalDataset } from '../document-ingestion/models/universal-dataset.model';
import puppeteer from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';

export interface FileInfo {
  name: string;
  path: string;
  sizeBytes: number;
}

@Injectable()
export class AdHocReportsService {
  private readonly logger = new Logger(AdHocReportsService.name);
  private ai: GoogleGenAI;

  constructor(
    private readonly coordinator: DocumentIngestionCoordinator,
    private readonly prisma: PrismaService,
    private readonly s3: S3Service
  ) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async generateReportFromUploads(files: Express.Multer.File[], userQuery: string, organizationId: string, templateId?: string): Promise<{ id: string, pdfUrl: string }> {
    if (files.length === 0) {
      throw new Error(`No files provided for ingestion.`);
    }

    this.logger.log(`Processing ${files.length} uploaded files for Ad-Hoc Report...`);

    // Create a temporary directory
    const tempDirId = require('crypto').randomUUID();
    const tempDirPath = path.join(require('os').tmpdir(), tempDirId);
    fs.mkdirSync(tempDirPath, { recursive: true });

    const tempFilePaths: string[] = [];

    try {
      // 1. Write buffers to temp directory
      for (const file of files) {
        // Multer normalizes filenames, but just in case, we extract the extension and save it safely
        const ext = path.extname(file.originalname) || '.xlsx';
        const safeName = `${require('crypto').randomUUID()}${ext}`;
        const tempPath = path.join(tempDirPath, safeName);
        
        fs.writeFileSync(tempPath, file.buffer);
        tempFilePaths.push(tempPath);
      }

      // 2. Process selected files sequentially to avoid overwhelming the custom LLM with concurrent requests
      const allDatasets: UniversalDataset[] = [];
      for (let i = 0; i < tempFilePaths.length; i++) {
        const file = tempFilePaths[i];
        const originalName = files[i].originalname;
        try {
          this.logger.log(`Processing file: ${originalName}`);
          const datasets = await this.coordinator.processDocument(file);
          // Override the sourceFile property to use the original filename instead of temp UUID
          for (const ds of datasets) {
            ds.sourceFile = originalName;
          }
          allDatasets.push(...datasets);
        } catch (err: any) {
          this.logger.warn(`Skipping file ${originalName} due to ingestion error: ${err.message}`);
        }
      }

      if (allDatasets.length === 0) {
        throw new Error('Failed to extract any valid datasets from the provided files.');
      }

    // 2. Construct the Data Context payload
    let dataContext = '';
    for (let i = 0; i < allDatasets.length; i++) {
      const ds = allDatasets[i];
      dataContext += `### Dataset ${i + 1}: ${ds.datasetName} (Source: ${ds.sourceFile})\n`;
      dataContext += `Schema: ${JSON.stringify(ds.schema.columns)}\n`;
      dataContext += `Rows:\n${JSON.stringify(ds.rows)}\n`;
      if (ds.quality && ds.quality.warnings && ds.quality.warnings.length > 0) {
        dataContext += `Data Quality Warnings (MUST REPORT): ${JSON.stringify(ds.quality.warnings)}\n`;
      }
      dataContext += `\n`;
    }

    // 3. Send to Gemini for unified HTML generation
    this.logger.log(`Datasets aggregated. Generating HTML Report...`);
    const prompt = `
You are an elite Business Intelligence AI Analyst.
The user wants a unified, production-grade executive report based on multiple selected data files.

USER QUERY / REPORT OBJECTIVES:
${userQuery}

DATA CONTEXT (Extracted from User's Excel Files):
${dataContext}

Generate a breathtaking, highly professional HTML report that strictly adheres to the following structural and design requirements:

### STRUCTURAL REQUIREMENTS:
1. **Executive Summary**: Always start with a high-level executive summary synthesizing the key takeaways across ALL provided files.
2. **Dedicated Source Sections**: Dynamically create a beautifully formatted section for EVERY distinct dataset or file provided in the Data Context. 
3. **Data Quality & Discrepancies**: If there are "Data Quality Warnings", include a highly visible "Data Discrepancies & Quality Issues" section.

### DESIGN & TECHNICAL REQUIREMENTS:
1. Do NOT output full <html>, <head>, or <body> tags. We will embed your output into our own branded template.
2. Use modern HTML with elegant tables, professional layouts, and generous spacing.
3. START IMMEDIATELY with the data tables or paragraphs. ABSOLUTELY NO overall report title or <h1> heading at the top. The system template already provides the title.
4. Do NOT use markdown backticks (e.g., \`\`\`html) around your output. Output pure, raw HTML only.
5. NO EXTERNAL IMAGES OR FONTS.
6. All tables MUST use 'table-layout: fixed; width: 100%; word-wrap: break-word;' to ensure columns do not get cut off horizontally.
`;

    let htmlOutput = '';
    try {
      htmlOutput = await generateWithFallbacks(prompt, false);
      const match = htmlOutput.match(/```(?:html)?\s*([\s\S]*?)```/);
      if (match && match[1]) {
        htmlOutput = match[1].trim();
      } else {
        htmlOutput = htmlOutput.trim();
      }
    } catch (err: any) {
      this.logger.error(`AI HTML Generation failed: ${err.message}`);
      throw new Error(`AI HTML Generation failed: ${err.message}`);
    }

    // Prepare template layout
    let layout: any = {
      primaryColor: '#3b82f6',
      header: { logoUrl: '', logoPosition: 'left', titleText: 'Generative Report', titlePosition: 'right', showDate: true },
      footer: { disclaimerText: 'Confidential - Internal Use Only', disclaimerPosition: 'left', signatureText: 'Generated automatically', signaturePosition: 'right', showPageNumbers: false }
    };

    if (templateId) {
      const template = await this.prisma.reportTemplate.findUnique({ where: { id: templateId } });
      if (template && template.layoutConfig) {
        layout = template.layoutConfig as any;
      }
    }

    const printSafeHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --brand-color: ${layout.primaryColor || '#3b82f6'};
    }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      background-color: #ffffff;
      color: #111111;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      display: flex;
      flex-direction: column;
      min-height: 1000px;
    }
    .report-header {
      position: relative;
      border-bottom: 3px solid var(--brand-color);
      padding-bottom: 15px;
      margin-bottom: 20px;
      min-height: 55px;
    }
    .report-logo {
      max-height: 50px;
      max-width: 200px;
      object-fit: contain;
    }
    .report-title {
      color: var(--brand-color);
      margin: 0;
      font-size: 24px;
    }
    .report-date {
      font-size: 12px;
      color: #666;
      margin-top: 5px;
    }
    .report-footer {
      margin-top: auto;
      padding-top: 40px;
      border-top: 1px solid #eee;
      position: relative;
      min-height: 100px;
    }
    .signature {
      font-style: italic;
      color: #444;
      border-top: 1px solid #111;
      padding-top: 5px;
      min-width: 200px;
      font-size: 14px;
    }
    .disclaimer {
      font-size: 10px;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    main { flex: 1; }
    main h1, main h2, main h3 { color: var(--brand-color); }
    main table { width: 100%; border-collapse: collapse !important; margin: 20px 0 !important; }
    main th { background-color: #f3f4f6 !important; color: #111 !important; border-bottom: 2px solid var(--brand-color) !important; padding: 10px !important; text-align: left !important; font-weight: 600 !important; }
    main td { padding: 10px !important; border-bottom: 1px solid #e5e7eb !important; }
    .absolute-left { position: absolute; left: 0; top: 0; }
    .absolute-center { position: absolute; left: 50%; transform: translateX(-50%); top: 0; text-align: center; }
    .absolute-right { position: absolute; right: 0; top: 0; text-align: right; }
    .footer-left { position: absolute; left: 0; bottom: 0; }
    .footer-center { position: absolute; left: 50%; transform: translateX(-50%); bottom: 0; text-align: center; }
    .footer-right { position: absolute; right: 0; bottom: 0; text-align: right; }
  </style>
</head>
<body>
  <div class="page-container">
    <header class="report-header">
      <div class="absolute-${layout.header?.logoPosition || 'left'}">
        ${layout.header?.logoUrl ? `<img src="${layout.header.logoUrl}" class="report-logo" alt="Company Logo" />` : `<div style="font-size: 24px; font-weight: 800; color: #1f2937;">Report</div>`}
      </div>
      <div class="absolute-${layout.header?.titlePosition || 'right'}">
        <h1 class="report-title">${layout.header?.titleText || 'Generative Report'}</h1>
        ${layout.header?.showDate ? `<div class="report-date">${new Date().toLocaleDateString()}</div>` : ''}
      </div>
    </header>
    <main>${htmlOutput}</main>
    <footer class="report-footer">
      <div class="footer-${layout.footer?.signaturePosition || 'right'}">
        <div class="signature">${layout.footer?.signatureText || ''}</div>
      </div>
      <div class="footer-${layout.footer?.disclaimerPosition || 'left'}">
        <div class="disclaimer">${layout.footer?.disclaimerText || ''}</div>
      </div>
    </footer>
  </div>
</body>
</html>
    `;

    // 4. Convert HTML to PDF using Puppeteer
    this.logger.log(`Converting HTML to PDF via Puppeteer...`);
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Inject HTML into the page
      await page.setContent(printSafeHtml, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Generate PDF buffer
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });
      
      await browser.close();
      
      const s3Key = `ad-hoc/${organizationId}/${new Date().getTime()}-report.pdf`;
      this.logger.log(`Ad-Hoc PDF Report generated successfully. Uploading to S3: ${s3Key}...`);

      const s3Bucket = await this.s3.uploadPdf(s3Key, pdfBuffer);
      this.logger.log('Saving to database...');

      const report = await this.prisma.adHocReport.create({
        data: {
          organizationId,
          name: `Custom Report - ${new Date().toLocaleDateString()}`,
          userQuery,
          s3Key,
          s3Bucket
        }
      });
      
      const pdfUrl = await this.s3.getPresignedUrl(s3Key, s3Bucket);
      return { id: report.id, pdfUrl };
    } catch (err: any) {
      this.logger.error(`PDF Generation failed: ${err.message}`);
      throw new Error(`PDF Generation failed: ${err.message}`);
    }

    } finally {
      // Clean up the temporary directory regardless of success or failure
      try {
        fs.rmSync(tempDirPath, { recursive: true, force: true });
        this.logger.log(`Cleaned up temporary directory: ${tempDirPath}`);
      } catch (e: any) {
        this.logger.error(`Failed to clean up temporary directory ${tempDirPath}: ${e.message}`);
      }
    }
  }

  async getAdHocReports(organizationId: string) {
    return this.prisma.adHocReport.findMany({
      where: { organizationId },
      select: { id: true, name: true, createdAt: true }, // Don't return heavy base64 here
      orderBy: { createdAt: 'desc' }
    });
  }

  async getAdHocReportById(organizationId: string, id: string) {
    const report = await this.prisma.adHocReport.findUnique({
      where: { id, organizationId },
      select: { id: true, name: true, s3Key: true, s3Bucket: true, createdAt: true, userQuery: true }
    });
    
    if (!report) return null;
    
    const pdfUrl = await this.s3.getPresignedUrl(report.s3Key, report.s3Bucket);
    
    return {
      ...report,
      pdfUrl,
    };
  }
}
