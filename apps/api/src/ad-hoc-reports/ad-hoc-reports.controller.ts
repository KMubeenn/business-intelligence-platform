import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdHocReportsService } from './ad-hoc-reports.service';
import type { Request } from 'express';

@Controller('reports/ad-hoc')
// @UseGuards(AuthGuard('jwt')) // Commented out for easier local testing. In prod, uncomment.
export class AdHocReportsController {
  constructor(private readonly adHocReportsService: AdHocReportsService) {}

  @Post('list-files')
  async listFiles(@Body() body: { folderPath: string }) {
    if (!body.folderPath) {
      throw new Error('folderPath is required');
    }
    const files = await this.adHocReportsService.listFiles(body.folderPath);
    return { files };
  }

  @Post('generate')
  async generateAdHocReport(
    @Body() body: { filePaths: string[]; userQuery: string }
  ) {
    if (!body.filePaths || body.filePaths.length === 0 || !body.userQuery) {
      throw new Error('filePaths and userQuery are required');
    }
    
    // Returns { pdfBase64: '...' }
    const pdfBase64 = await this.adHocReportsService.generateFolderReportPdf(
      body.filePaths, 
      body.userQuery
    );
    
    return { pdfBase64 };
  }
}
