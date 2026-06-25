import { Controller, Get, Post, Body, UseGuards, Req, Param, Put, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import type { Request } from 'express';

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async getReports(@Req() req: Request) {
    const user = req.user as any;
    return this.reportsService.getReports(user.organizationId);
  }

  @Get(':id')
  async getReport(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.reportsService.getReport(user.organizationId, id);
  }

  @Post()
  async createReport(@Req() req: Request, @Body() body: any) {
    const user = req.user as any;
    return this.reportsService.createReport(user.organizationId, body);
  }

  @Put(':id')
  async updateReport(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const user = req.user as any;
    return this.reportsService.updateReport(user.organizationId, id, body);
  }

  @Delete(':id')
  async deleteReport(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.reportsService.deleteReport(user.organizationId, id);
  }

  @Post(':id/execute')
  async executeReportManually(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.reportsService.triggerReportExecution(user.organizationId, id);
  }
}
