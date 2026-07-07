import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSourceType } from '@prisma/client';
import { BaseConnector } from './base.connector';
import { MySQLConnector } from './implementations/mysql.connector';
import { PostgreSQLConnector } from './implementations/postgresql.connector';
import { ShopifyConnector } from './implementations/shopify.connector';
import { RestApiConnector } from './implementations/rest-api.connector';
import { ExcelConnector } from './implementations/excel.connector';
import { DocumentIngestionCoordinator } from '../document-ingestion/document-ingestion.coordinator';

@Injectable()
export class ConnectorFactory {
  constructor(private readonly ingestionCoordinator: DocumentIngestionCoordinator) {}

  getConnector(type: DataSourceType, config: any): BaseConnector {
    switch (type) {
      case 'MYSQL':
        return new MySQLConnector(config);
      case 'POSTGRESQL':
        return new PostgreSQLConnector(config);
      case 'SHOPIFY':
        return new ShopifyConnector(config);
      case 'REST_API':
        return new RestApiConnector(config);
      case 'EXCEL':
        return new ExcelConnector(config, this.ingestionCoordinator);
      default:
        throw new BadRequestException(
          `Connector for type ${String(type)} is not implemented`,
        );
    }
  }
}
