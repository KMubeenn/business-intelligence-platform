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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DataSourceService } from './data-source.service';
import { CreateDataSourceDto } from './dto/create-data-source.dto';
import { UpdateDataSourceDto } from './dto/update-data-source.dto';
import { AuthGuard } from '@nestjs/passport';

import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('data-sources')
export class DataSourceController {
  constructor(private readonly dataSourceService: DataSourceService) {}

  @Post('upload-excel')
  @Roles('OWNER', 'ADMIN')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async uploadExcel(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    if (!file) {
      throw new BadRequestException('No Excel file uploaded');
    }

    // Pass the local file path to the config
    const dto: CreateDataSourceDto = {
      name: name || file.originalname,
      type: 'EXCEL' as any,
      configurationJson: { filePath: file.path },
    };

    return this.dataSourceService.create(dto, req.user.organizationId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
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
  @Roles('OWNER', 'ADMIN')
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
  @Roles('OWNER', 'ADMIN')
  remove(
    @Param('id') id: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.remove(id, req.user.organizationId);
  }

  @Post(':id/test')
  @Roles('OWNER', 'ADMIN')
  testConnection(
    @Param('id') id: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.testConnection(id, req.user.organizationId);
  }

  @Post(':id/schema/discover')
  @Roles('OWNER', 'ADMIN')
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
  @Roles('OWNER', 'ADMIN')
  enableTableSync(
    @Param('id') id: string,
    @Body('tableName') tableName: string,
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.enableTableSync(id, req.user.organizationId, tableName);
  }

  @Delete(':id/tables/:tableName')
  @Roles('OWNER', 'ADMIN')
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
  @Roles('OWNER', 'ADMIN')
  updateFieldMapping(
    @Param('id') id: string,
    @Param('tableName') tableName: string,
    @Body() body: { canonicalModelId: string, mappingRules: any },
    @Request() req: { user: { organizationId: string } },
  ) {
    return this.dataSourceService.updateFieldMapping(id, req.user.organizationId, tableName, body.canonicalModelId, body.mappingRules);
  }
}
