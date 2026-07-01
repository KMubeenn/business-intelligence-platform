import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreateTemplateDto {
  name: string;
  isDefault?: boolean;
  layoutConfig: any;
}

export class UpdateTemplateDto {
  name?: string;
  isDefault?: boolean;
  layoutConfig?: any;
}

@Injectable()
export class ReportTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizationId: string) {
    return this.prisma.reportTemplate.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const template = await this.prisma.reportTemplate.findFirst({
      where: { id, organizationId },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async create(organizationId: string, data: CreateTemplateDto) {
    if (data.isDefault) {
      // Unset any existing default template for this org
      await this.prisma.reportTemplate.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.reportTemplate.create({
      data: {
        organizationId,
        name: data.name,
        isDefault: data.isDefault || false,
        layoutConfig: data.layoutConfig,
      },
    });
  }

  async update(organizationId: string, id: string, data: UpdateTemplateDto) {
    await this.findOne(organizationId, id); // ensure it exists

    if (data.isDefault) {
      await this.prisma.reportTemplate.updateMany({
        where: { organizationId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.reportTemplate.update({
      where: { id },
      data: {
        name: data.name,
        isDefault: data.isDefault,
        layoutConfig: data.layoutConfig,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    const template = await this.findOne(organizationId, id);
    
    // Check if it's used by any report configs
    const count = await this.prisma.reportConfig.count({
      where: { templateId: id }
    });
    
    if (count > 0) {
      throw new BadRequestException('Cannot delete template because it is used by existing reports');
    }

    return this.prisma.reportTemplate.delete({
      where: { id },
    });
  }
}
