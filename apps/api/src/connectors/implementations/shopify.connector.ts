import { BaseConnector } from '../base.connector';

export class ShopifyConnector extends BaseConnector {
  async connect(): Promise<void> {
    // TODO: Implement Shopify connect
  }

  async disconnect(): Promise<void> {
    // TODO: Implement Shopify disconnect
  }

  async validate(): Promise<boolean> {
    // TODO: Implement Shopify validation
    return Promise.resolve(true);
  }

  async testConnection(): Promise<boolean> {
    // TODO: Implement Shopify test connection
    return Promise.resolve(true);
  }

  async getTables(): Promise<string[]> {
    return Promise.resolve([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getColumns(tableName: string): Promise<any[]> {
    return Promise.resolve([]);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sync(tableName: string, incrementalColumn?: string | null, lastSyncTimestamp?: Date | null): Promise<Record<string, unknown>[]> {
    // TODO: Implement Shopify sync
    return Promise.resolve([]);
  }
}
