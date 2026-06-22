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
