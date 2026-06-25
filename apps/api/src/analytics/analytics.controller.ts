import { Controller, Get, UseGuards, Req, Query, ParseUUIDPipe } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary(@Req() req: Request) {
    const user = req.user as any;
    return this.analyticsService.getOverallMetrics(user.organizationId);
  }

  @Get('pipeline-overview')
  async getPipelineOverview(@Req() req: Request) {
    const user = req.user as any;
    return this.analyticsService.getPipelineOverview(user.organizationId);
  }

  @Get('source-detail')
  async getSourceDetail(
    @Req() req: Request,
    @Query('sourceId') sourceId: string,
  ) {
    const user = req.user as any;
    return this.analyticsService.getSourceDetail(user.organizationId, sourceId);
  }

  @Get('explorer')
  async getExplorerData(
    @Req() req: Request,
    @Query('modelId', ParseUUIDPipe) modelId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('source') source?: string,
  ) {
    const user = req.user as any;
    return this.analyticsService.getExplorerData(
      user.organizationId,
      modelId,
      page ? parseInt(page) : 1,
      pageSize ? parseInt(pageSize) : 50,
      source,
    );
  }

  @Get('query')
  async getAggregatedData(
    @Req() req: Request,
    @Query('modelId', ParseUUIDPipe) modelId: string,
    @Query('groupBy') groupBy?: string,
    @Query('metricField') metricField?: string,
    @Query('metricType') metricType?: 'sum' | 'count' | 'avg'
  ) {
    const user = req.user as any;
    return this.analyticsService.getAggregatedData(
      user.organizationId,
      modelId,
      groupBy,
      metricField,
      metricType
    );
  }
}
