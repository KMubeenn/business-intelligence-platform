import { DataSourceType } from '@prisma/client';

export class CreateDataSourceDto {
  name: string;
  type: DataSourceType;
  configurationJson: any;
}
