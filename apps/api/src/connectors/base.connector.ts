import { IConnector } from './interfaces/connector.interface';

export abstract class BaseConnector implements IConnector {
  protected config: any;

  constructor(config: any) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    this.config = config;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract validate(): Promise<boolean>;
  abstract testConnection(): Promise<boolean>;
  abstract getTables(): Promise<string[]>;
  abstract getColumns(tableName: string): Promise<any[]>;
  abstract sync(tableName: string, incrementalColumn?: string | null, lastSyncTimestamp?: Date | null): Promise<Record<string, unknown>[]>;
}
