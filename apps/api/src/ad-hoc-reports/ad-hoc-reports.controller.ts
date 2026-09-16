import { Controller, Post, Body, UseGuards, UseInterceptors, UploadedFiles, Get, Param, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AdHocReportsService } from './ad-hoc-reports.service';

@Controller('reports/ad-hoc')
@UseGuards(AuthGuard('jwt'))
export class AdHocReportsController {
  constructor(private readonly adHocReportsService: AdHocReportsService) { }

  @Post('generate')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async generateAdHocReport(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('userQuery') userQuery: string,
    @Request() req: any,
    @Body('templateId') templateId?: string,
  ) {
    if (!files || files.length === 0 || !userQuery) {
      throw new Error('files and userQuery are required');
    }

    const organizationId = req.user.organizationId;

    // Returns { id: string, pdfBase64: '...' }
    const result = await this.adHocReportsService.generateReportFromUploads(
      files,
      userQuery,
      organizationId,
      templateId
    );

    return result;
  }

  @Get()
  async getAdHocReports(@Request() req: any) {
    return this.adHocReportsService.getAdHocReports(req.user.organizationId);
  }

  @Get(':id')
  async getAdHocReportById(@Param('id') id: string, @Request() req: any) {
    return this.adHocReportsService.getAdHocReportById(req.user.organizationId, id);
  }
}
