import { DataSourceType, DataSourceStatus } from '@prisma/client';

export class UpdateDataSourceDto {
  name?: string;
  type?: DataSourceType;
  status?: DataSourceStatus;
  configurationJson?: any;
}
