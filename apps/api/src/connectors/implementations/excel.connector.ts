import { BaseConnector } from '../base.connector';
import * as fs from 'fs';
import { DocumentIngestionCoordinator } from '../../document-ingestion/document-ingestion.coordinator';

interface ExcelConfig {
  filePath: string;
}

export class ExcelConnector extends BaseConnector {
  private coordinator: DocumentIngestionCoordinator;

  constructor(config: any, coordinator: DocumentIngestionCoordinator) {
    super(config);
    this.coordinator = coordinator;
  }

  async connect(): Promise<void> {
    // No connection needed
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
      if (!fs.existsSync(config.filePath)) return false;
      // Triggers AI ingestion if not cached, acting as a robust test
      await this.coordinator.processDocument(config.filePath);
      return true;
    } catch (error) {
      console.error('Excel connection test failed:', error);
      return false;
    }
  }

  async getTables(): Promise<string[]> {
    const config = this.config as ExcelConfig;
    const datasets = await this.coordinator.processDocument(config.filePath);
    return datasets.map(d => d.datasetName);
  }

  async getColumns(datasetName: string): Promise<any[]> {
    const config = this.config as ExcelConfig;
    const datasets = await this.coordinator.processDocument(config.filePath);
    const dataset = datasets.find(d => d.datasetName === datasetName);
    if (!dataset) throw new Error(`Dataset ${datasetName} not found in Excel file`);
    
    return dataset.schema.columns.map(col => ({
      name: col.normalizedName,
      type: col.type,
    }));
  }

  async sync(datasetName: string, incrementalColumn?: string | null, lastSyncTimestamp?: Date | null): Promise<Record<string, unknown>[]> {
    const config = this.config as ExcelConfig;
    const datasets = await this.coordinator.processDocument(config.filePath);
    const dataset = datasets.find(d => d.datasetName === datasetName);
    if (!dataset) throw new Error(`Dataset ${datasetName} not found in Excel file`);

    // Ensure headers use the normalizedName rather than the raw original name
    return dataset.rows.map(row => {
      const normalizedRow: Record<string, unknown> = {};
      for (const col of dataset.schema.columns) {
        // The AI output row might use the raw name or the normalized name.
        // We'll map whatever it returned to the normalized name for the sync engine.
        const val = row[col.name] !== undefined ? row[col.name] : row[col.normalizedName];
        normalizedRow[col.normalizedName] = val;
      }
      return normalizedRow;
    });
  }
}
