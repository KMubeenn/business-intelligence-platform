import { BaseConnector } from '../base.connector';
import * as xlsx from 'xlsx';

interface ExcelConfig {
  filePath: string;
}

export class ExcelConnector extends BaseConnector {
  async connect(): Promise<void> {
    // Reading an excel file does not require a long-lived connection
  }

  async disconnect(): Promise<void> {
    // Nothing to disconnect
  }

  async validate(): Promise<boolean> {
    return this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    try {
      const config = this.config as ExcelConfig;
      // Just try to read the file to ensure it exists and is valid
      xlsx.readFile(config.filePath);
      return true;
    } catch (error) {
      console.error('Excel connection test failed:', error);
      return false;
    }
  }

  async getTables(): Promise<string[]> {
    const config = this.config as ExcelConfig;
    const workbook = xlsx.readFile(config.filePath);
    // In Excel, each Sheet acts as a Table
    return workbook.SheetNames;
  }

  async getColumns(sheetName: string): Promise<any[]> {
    const config = this.config as ExcelConfig;
    const workbook = xlsx.readFile(config.filePath);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Sheet ${sheetName} not found in Excel file`);

    // Parse the first row to get headers
    const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    if (json.length === 0) return [];
    
    const headers = json[0] as string[];
    return headers.map(header => ({
      name: String(header),
      type: 'string', // Default to string for Excel columns
    }));
  }

  async sync(sheetName: string, incrementalColumn?: string | null, lastSyncTimestamp?: Date | null): Promise<Record<string, unknown>[]> {
    const config = this.config as ExcelConfig;
    const workbook = xlsx.readFile(config.filePath);
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error(`Sheet ${sheetName} not found in Excel file`);

    // Convert the entire sheet to an array of JSON objects
    const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);
    return rows;
  }
}
