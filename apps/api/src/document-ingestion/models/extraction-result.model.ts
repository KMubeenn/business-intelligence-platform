export interface IExtractionResult {
  datasetName: string;
  description?: string;
  headerRowIndex?: number;
  dataStartRowIndex?: number;
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    primaryDimension: boolean;
    sourceColumnRef?: string;
  }>;
  rows: Array<Record<string, any>>;
  metadata?: any;
  confidence?: number;
  nextContext?: any;
}
