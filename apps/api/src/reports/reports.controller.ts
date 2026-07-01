import { Controller, Get, Post, Body, UseGuards, Req, Param, Put, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import type { Request } from 'express';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
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
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async createReport(@Req() req: Request, @Body() body: any) {
    const user = req.user as any;
    return this.reportsService.createReport(user.organizationId, body);
  }

  @Put(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async updateReport(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const user = req.user as any;
    return this.reportsService.updateReport(user.organizationId, id, body);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async deleteReport(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.reportsService.deleteReport(user.organizationId, id);
  }

  @Post(':id/execute')
  @Roles('OWNER', 'ADMIN', 'MEMBER')
  async executeReportManually(@Req() req: Request, @Param('id') id: string) {
    const user = req.user as any;
    return this.reportsService.triggerReportExecution(user.organizationId, id);
  }
}
