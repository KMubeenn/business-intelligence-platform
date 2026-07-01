import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as cronParser from 'cron-parser';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('report-generation') private reportQueue: Queue,
  ) {}

  async getReports(organizationId: string) {
    return this.prisma.reportConfig.findMany({
      where: { organizationId },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReport(organizationId: string, id: string) {
    const report = await this.prisma.reportConfig.findFirst({
      where: { id, organizationId },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async createReport(organizationId: string, data: any) {
    try {
      cronParser.parseExpression(data.cronSchedule);
    } catch (err) {
      throw new BadRequestException('Invalid cron schedule format');
    }

    return this.prisma.reportConfig.create({
      data: {
        organizationId,
        name: data.name,
        userQuery: data.userQuery,
        cronSchedule: data.cronSchedule,
        targetEmails: data.targetEmails,
        includedModels: data.includedModels,
        templateId: data.templateId,
        isActive: data.isActive ?? true,
      },
    });
  }

  async updateReport(organizationId: string, id: string, data: any) {
    if (data.cronSchedule) {
      try {
        cronParser.parseExpression(data.cronSchedule);
      } catch (err) {
        throw new BadRequestException('Invalid cron schedule format');
      }
    }

    return this.prisma.reportConfig.updateMany({
      where: { id, organizationId },
      data: {
        name: data.name,
        userQuery: data.userQuery,
        cronSchedule: data.cronSchedule,
        targetEmails: data.targetEmails,
        includedModels: data.includedModels,
        templateId: data.templateId,
        isActive: data.isActive,
      },
    });
  }

  async deleteReport(organizationId: string, id: string) {
    return this.prisma.reportConfig.deleteMany({
      where: { id, organizationId },
    });
  }

  async triggerReportExecution(organizationId: string, id: string) {
    const config = await this.prisma.reportConfig.findFirst({
      where: { id, organizationId },
    });

    if (!config) throw new NotFoundException('Report config not found');

    const execution = await this.prisma.reportExecution.create({
      data: {
        reportConfigId: config.id,
        status: 'PENDING',
      },
    });

    await this.reportQueue.add('generate-report', {
      executionId: execution.id,
      configId: config.id,
      organizationId,
    }, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 60000 // 60s, 120s, 240s...
      }
    });

    return execution;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    const configs = await this.prisma.reportConfig.findMany({
      where: { isActive: true },
    });

    const now = new Date();

    for (const config of configs) {
      try {
        const interval = cronParser.parseExpression(config.cronSchedule);
        const next = interval.next().toDate();
        const prev = interval.prev().toDate();

        // If the prev schedule was within the last minute, trigger it
        if (now.getTime() - prev.getTime() < 60000) {
          console.log(`Triggering scheduled report: ${config.name}`);
          
          const execution = await this.prisma.reportExecution.create({
            data: {
              reportConfigId: config.id,
              status: 'PENDING',
            },
          });

          await this.reportQueue.add('generate-report', {
            executionId: execution.id,
            configId: config.id,
            organizationId: config.organizationId,
          }, {
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 60000
            }
          });
        }
      } catch (err) {
        console.error(`Failed to parse cron for report ${config.id}:`, err);
      }
    }
  }
}
