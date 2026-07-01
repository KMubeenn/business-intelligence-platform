import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportTemplatesService, CreateTemplateDto, UpdateTemplateDto } from './report-templates.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('report-templates')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportTemplatesController {
  constructor(private readonly templatesService: ReportTemplatesService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.templatesService.findAll(req.user.organizationId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(@Request() req: any, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(req.user.organizationId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(req.user.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.templatesService.remove(req.user.organizationId, id);
  }
}
