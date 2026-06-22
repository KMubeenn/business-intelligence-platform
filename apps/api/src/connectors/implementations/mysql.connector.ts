import { BaseConnector } from '../base.connector';
import * as mysql from 'mysql2/promise';

interface MySqlConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

export class MySQLConnector extends BaseConnector {
  private connection: mysql.Connection | null = null;

  async connect(): Promise<void> {
    if (!this.connection) {
      const config = this.config as MySqlConfig;
      this.connection = await mysql.createConnection({
        host: config.host,
        port: config.port || 3306,
        user: config.user,
        password: config.password,
        database: config.database,
      });
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
  }

  async validate(): Promise<boolean> {
    return this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      await this.connection!.ping();
      await this.disconnect();
      return true;
    } catch (error) {
      console.error('MySQL connection test failed:', error);
      return false;
    }
  }

  async getTables(): Promise<string[]> {
    try {
      await this.connect();
      const [rows] = await this.connection!.execute('SHOW TABLES');
      const tables: string[] = [];
      const config = this.config as MySqlConfig;
      const dbName = config.database;

      for (const row of rows as Record<string, unknown>[]) {
        const tableName =
          row[`Tables_in_${dbName as string}`] || Object.values(row)[0];
        if (tableName) {
          tables.push(tableName as string);
        }
      }

      await this.disconnect();
      return tables;
    } catch (error) {
      console.error('MySQL getTables failed:', error);
      throw error;
    }
  }

  async getColumns(tableName: string): Promise<any[]> {
    try {
      await this.connect();
      const [rows] = await this.connection!.query(`SHOW COLUMNS FROM ??`, [
        tableName,
      ]);
      await this.disconnect();
      return rows as any[];
    } catch (error) {
      console.error(`MySQL getColumns failed for table ${tableName}:`, error);
      throw error;
    }
  }

  async sync(tableName: string, incrementalColumn?: string | null, lastSyncTimestamp?: Date | null): Promise<Record<string, unknown>[]> {
    try {
      await this.connect();
      
      let query = `SELECT * FROM ??`;
      const params: any[] = [tableName];

      if (incrementalColumn && lastSyncTimestamp) {
        query += ` WHERE ?? > ?`;
        params.push(incrementalColumn, lastSyncTimestamp);
      }

      const [rows] = await this.connection!.query(query, params);
      await this.disconnect();
      return rows as Record<string, unknown>[];
    } catch (error) {
      console.error(`MySQL sync failed for table ${tableName}:`, error);
      throw error;
    }
  }
}
