import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CanonicalModelService } from './canonical-model.service';
import { CreateCanonicalModelDto } from './dto/create-canonical-model.dto';
import { UpdateCanonicalModelDto } from './dto/update-canonical-model.dto';

@Controller('canonical-models')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CanonicalModelController {
  constructor(private readonly canonicalModelService: CanonicalModelService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(
    @Body() createDto: CreateCanonicalModelDto,
    @Request() req: { user: { organizationId: string } }
  ) {
    return this.canonicalModelService.create(createDto, req.user.organizationId);
  }

  @Get()
  async getModels(@Request() req: { user: { organizationId: string } }) {
    return this.canonicalModelService.findAll(req.user.organizationId);
  }

  @Put(':id')
  @Roles('OWNER', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCanonicalModelDto,
    @Request() req: { user: { organizationId: string } }
  ) {
    return this.canonicalModelService.update(id, updateDto, req.user.organizationId);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  async remove(
    @Param('id') id: string,
    @Request() req: { user: { organizationId: string } }
  ) {
    return this.canonicalModelService.remove(id, req.user.organizationId);
  }
}
