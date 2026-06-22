import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDataSourceDto } from './dto/create-data-source.dto';
import { UpdateDataSourceDto } from './dto/update-data-source.dto';
import { ConnectorFactory } from '../connectors/connector.factory';

@Injectable()
export class DataSourceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorFactory: ConnectorFactory,
  ) {}

  async create(
    createDataSourceDto: CreateDataSourceDto,
    organizationId: string,
  ) {
    return this.prisma.dataSource.create({
      data: {
        ...createDataSourceDto,
        organizationId,
      },
    });
  }

  async findAll(organizationId: string) {
    return this.prisma.dataSource.findMany({
      where: { organizationId },
    });
  }

  async findOne(id: string, organizationId: string) {
    const dataSource = await this.prisma.dataSource.findFirst({
      where: { id, organizationId },
    });

    if (!dataSource) {
      throw new NotFoundException(
        `DataSource with ID ${id} not found in your organization`,
      );
    }

    return dataSource;
  }

  async update(
    id: string,
    updateDataSourceDto: UpdateDataSourceDto,
    organizationId: string,
  ) {
    const dataSource = await this.findOne(id, organizationId);

    return this.prisma.dataSource.update({
      where: { id: dataSource.id },
      data: updateDataSourceDto,
    });
  }

  async remove(id: string, organizationId: string) {
    const dataSource = await this.findOne(id, organizationId);

    return this.prisma.dataSource.delete({
      where: { id: dataSource.id },
    });
  }

  async testConnection(id: string, organizationId: string) {
    const dataSource = await this.findOne(id, organizationId);
    const connector = this.connectorFactory.getConnector(
      dataSource.type,
      dataSource.configurationJson,
    );

    const isConnected = await connector.testConnection();
    if (!isConnected) {
      throw new BadRequestException(
        'Connection test failed. Please check your credentials.',
      );
    }
    return { success: true, message: 'Connection successful!' };
  }

  async discoverSchema(id: string, organizationId: string) {
    const dataSource = await this.findOne(id, organizationId);
    const connector = this.connectorFactory.getConnector(
      dataSource.type,
      dataSource.configurationJson,
    );

    try {
      const tables = await connector.getTables();
      const schema: Record<string, any[]> = {};

      for (const table of tables) {
        schema[table] = await connector.getColumns(table);
      }

      const updatedDataSource = await this.prisma.dataSource.update({
        where: { id: dataSource.id },
        data: { schemaJson: schema },
      });

      return updatedDataSource;
    } catch (error: unknown) {
      throw new BadRequestException(
        `Schema discovery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getEnabledTables(id: string, organizationId: string) {
    const dataSource = await this.findOne(id, organizationId);
    return this.prisma.rawTable.findMany({
      where: { dataSourceId: dataSource.id, syncEnabled: true },
    });
  }

  async enableTableSync(id: string, organizationId: string, tableName: string) {
    const dataSource = await this.findOne(id, organizationId);
    
    // Check if it already exists
    const existing = await this.prisma.rawTable.findFirst({
      where: { dataSourceId: dataSource.id, tableName },
    });
    
    if (existing) {
      if (!existing.syncEnabled) {
        return this.prisma.rawTable.update({
          where: { id: existing.id },
          data: { syncEnabled: true },
        });
      }
      return existing;
    }

    return this.prisma.rawTable.create({
      data: {
        dataSourceId: dataSource.id,
        tableName,
        syncEnabled: true,
      },
    });
  }

  async disableTableSync(id: string, organizationId: string, tableName: string) {
    const dataSource = await this.findOne(id, organizationId);
    
    const existing = await this.prisma.rawTable.findFirst({
      where: { dataSourceId: dataSource.id, tableName },
    });

    if (!existing) {
      return { success: true };
    }

    await this.prisma.rawTable.update({
      where: { id: existing.id },
      data: { syncEnabled: false },
    });

    return { success: true };
  }

  async getRawRecords(id: string, organizationId: string, tableName: string) {
    const dataSource = await this.findOne(id, organizationId);
    
    const rawTable = await this.prisma.rawTable.findFirst({
      where: { dataSourceId: dataSource.id, tableName },
    });

    if (!rawTable) {
      throw new NotFoundException(`Table ${tableName} not found or sync not enabled`);
    }

    return this.prisma.rawRecord.findMany({
      where: { rawTableId: rawTable.id },
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { canonicalRecord: true },
    });
  }

  async getFieldMapping(id: string, organizationId: string, tableName: string) {
    const dataSource = await this.findOne(id, organizationId);
    
    const rawTable = await this.prisma.rawTable.findFirst({
      where: { dataSourceId: dataSource.id, tableName },
    });

    if (!rawTable) {
      throw new NotFoundException(`Table ${tableName} not found`);
    }

    const mapping = await this.prisma.fieldMapping.findFirst({
      where: { rawTableId: rawTable.id },
      include: { canonicalModel: true }
    });

    return mapping || { mappingRules: {} };
  }

  async updateFieldMapping(id: string, organizationId: string, tableName: string, canonicalModelId: string, mappingRules: any) {
    const dataSource = await this.findOne(id, organizationId);
    
    const rawTable = await this.prisma.rawTable.findFirst({
      where: { dataSourceId: dataSource.id, tableName },
    });

    if (!rawTable) {
      throw new NotFoundException(`Table ${tableName} not found`);
    }

    // Upsert mapping
    const existing = await this.prisma.fieldMapping.findFirst({
      where: { rawTableId: rawTable.id }
    });

    let result;
    if (existing) {
      result = await this.prisma.fieldMapping.update({
        where: { id: existing.id },
        data: { canonicalModelId, mappingRules }
      });
    } else {
      result = await this.prisma.fieldMapping.create({
        data: {
          canonicalModelId,
          rawTableId: rawTable.id,
          mappingRules
        }
      });
    }

    // Force re-transformation by deleting existing CanonicalRecords for this table
    await this.prisma.canonicalRecord.deleteMany({
      where: {
        rawRecord: {
          rawTableId: rawTable.id
        }
      }
    });

    return result;
  }
}
