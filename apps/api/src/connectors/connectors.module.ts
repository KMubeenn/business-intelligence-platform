import { Module } from '@nestjs/common';
import { ConnectorFactory } from './connector.factory';
import { DocumentIngestionModule } from '../document-ingestion/document-ingestion.module';

@Module({
  imports: [DocumentIngestionModule],
  providers: [ConnectorFactory],
  exports: [ConnectorFactory],
})
export class ConnectorsModule {}
