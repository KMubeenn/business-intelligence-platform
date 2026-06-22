import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DataSourceService } from './data-source.service';
import { CreateDataSourceDto } from './dto/create-data-source.dto';
import { UpdateDataSourceDto } from './dto/update-data-source.dto';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('data-sources')
export class DataSourceController {
  constructor(private readonly dataSourceService: DataSourceService) {}

  @Post()
  create(
    @Body() createDataSourceDto: CreateDataSourceDto,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.create(
      createDataSourceDto,
      req.user.organizationId,
    );
  }

  @Get()
  findAll(@Request() req: { user: { organizationId: string } }) {
    return this.dataSourceService.findAll(req.user.organizationId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.findOne(id, req.user.organizationId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateDataSourceDto: UpdateDataSourceDto,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.update(
      id,
      updateDataSourceDto,
      req.user.organizationId,
    );
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.remove(id, req.user.organizationId);
  }

  @Post(':id/test')
  testConnection(
    @Param('id') id: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.testConnection(id, req.user.organizationId);
  }

  @Post(':id/schema/discover')
  discoverSchema(
    @Param('id') id: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.discoverSchema(id, req.user.organizationId);
  }

  @Get(':id/schema')
  async getSchema(
    @Param('id') id: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    const dataSource = await this.dataSourceService.findOne(
      id,
      req.user.organizationId,
    );
    return dataSource.schemaJson || {};
  }

  @Get(':id/tables')
  getEnabledTables(
    @Param('id') id: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.getEnabledTables(id, req.user.organizationId);
  }

  @Post(':id/tables')
  enableTableSync(
    @Param('id') id: string,
    @Body('tableName') tableName: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.enableTableSync(id, req.user.organizationId, tableName);
  }

  @Delete(':id/tables/:tableName')
  disableTableSync(
    @Param('id') id: string,
    @Param('tableName') tableName: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.disableTableSync(id, req.user.organizationId, tableName);
  }

  @Get(':id/tables/:tableName/records')
  getRawRecords(
    @Param('id') id: string,
    @Param('tableName') tableName: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.getRawRecords(id, req.user.organizationId, tableName);
  }

  @Get(':id/tables/:tableName/mappings')
  getFieldMapping(
    @Param('id') id: string,
    @Param('tableName') tableName: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.getFieldMapping(id, req.user.organizationId, tableName);
  }

  @Put(':id/tables/:tableName/mappings')
  updateFieldMapping(
    @Param('id') id: string,
    @Param('tableName') tableName: string,
    @Body() body: { canonicalModelId: string, mappingRules: any },
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.updateFieldMapping(id, req.user.organizationId, tableName, body.canonicalModelId, body.mappingRules);
  }
}
