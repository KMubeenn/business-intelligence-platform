import { Injectable, Logger } from '@nestjs/common';
import { generateWithFallbacks } from '../utils/ai-generator.util';
import { DocumentIngestionCoordinator } from '../document-ingestion/document-ingestion.coordinator';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
import { UniversalDataset } from '../document-ingestion/models/universal-dataset.model';
import puppeteer from 'puppeteer';

export interface FileInfo {
  name: string;
  path: string;
  sizeBytes: number;
}

@Injectable()
export class AdHocReportsService {
  private readonly logger = new Logger(AdHocReportsService.name);
  private ai: GoogleGenAI;

  constructor(private readonly coordinator: DocumentIngestionCoordinator) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async listFiles(folderPath: string): Promise<FileInfo[]> {
    this.logger.log(`Scanning folder ${folderPath} for excel files...`);
    try {
      const allItems = fs.readdirSync(folderPath);
      const excelFiles = allItems.filter(f => f.endsWith('.xls') || f.endsWith('.xlsx'));
      
      return excelFiles.map(file => {
        const fullPath = path.join(folderPath, file);
        const stats = fs.statSync(fullPath);
        return {
          name: file,
          path: fullPath,
          sizeBytes: stats.size
        };
      });
    } catch (err: any) {
      this.logger.error(`Failed to list files in ${folderPath}: ${err.message}`);
      throw new Error(`Invalid folder path: ${err.message}`);
    }
  }

  async generateFolderReportPdf(filePaths: string[], userQuery: string): Promise<string> {
    if (filePaths.length === 0) {
      throw new Error(`No files selected for ingestion.`);
    }

    this.logger.log(`Processing ${filePaths.length} files for Ad-Hoc Report...`);

    // 1. Process selected files sequentially
    const allDatasets: UniversalDataset[] = [];
    for (const file of filePaths) {
      try {
        this.logger.log(`Processing file: ${file}`);
        const datasets = await this.coordinator.processDocument(file);
        allDatasets.push(...datasets);
      } catch (err: any) {
        this.logger.warn(`Skipping file ${file} due to ingestion error: ${err.message}`);
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
   - For example, if a "Staff Sales" file is provided, create a dedicated "Staff Sales Analysis" section. 
   - If a "Howdy F7" file is provided, create a dedicated "Howdy F7 Insights" section.
   - You MUST respect and deeply analyze ALL datasets provided in the context. Do not ignore any data source.
3. **Data Quality & Discrepancies**: If there are "Data Quality Warnings" in the Data Context, you MUST include a highly visible "Data Discrepancies & Quality Issues" section to highlight these errors to the executive.

### DESIGN & TECHNICAL REQUIREMENTS:
1. Provide a standalone HTML payload (you CAN include <html>, <head>, <style>, <body> tags for this PDF generation).
2. Use modern, premium CSS inside <style> tags (e.g., Arial/Helvetica, clean padding, subtle borders, elegant tables, professional color palettes, and generous spacing).
3. Use HTML tables or CSS grids to visualize the data trends and numbers clearly.
4. Do NOT use markdown backticks (e.g., \`\`\`html) around your output. Output pure, raw HTML only.
5. NO EXTERNAL IMAGES OR FONTS that require downloading.
6. CRITICAL FOR PDF EXPORT: All tables MUST use 'table-layout: fixed; width: 100%; word-wrap: break-word;' to ensure columns do not get cut off horizontally.
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

    // 4. Convert HTML to PDF using Puppeteer
    this.logger.log(`Converting HTML to PDF via Puppeteer...`);
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      
      // Inject safety CSS to guarantee tables wrap correctly on A4 PDFs
      const printSafeHtml = `
        <style>
          body { max-width: 100%; overflow-x: hidden; }
          table { table-layout: fixed !important; width: 100% !important; word-wrap: break-word !important; }
          th, td { word-wrap: break-word !important; overflow-wrap: break-word !important; white-space: normal !important; }
        </style>
        ${htmlOutput}
      `;
      
      // Inject HTML into the page (use domcontentloaded to prevent hanging on external resources)
      await page.setContent(printSafeHtml, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Generate PDF buffer
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });
      
      await browser.close();
      
      this.logger.log('Ad-Hoc PDF Report generated successfully.');
      return Buffer.from(pdfBuffer).toString('base64');
    } catch (err: any) {
      this.logger.error(`PDF Generation failed: ${err.message}`);
      throw new Error(`PDF Generation failed: ${err.message}`);
    }
  }
}
