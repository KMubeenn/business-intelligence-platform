export interface IConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  validate(): Promise<boolean>;
  testConnection(): Promise<boolean>;
  getTables(): Promise<string[]>;
  getColumns(tableName: string): Promise<any[]>;
  sync(tableName: string, incrementalColumn?: string | null, lastSyncTimestamp?: Date | null): Promise<Record<string, unknown>[]>;
}
