export interface IExtractionResult {
  datasetName: string;
  description: string;
  columns: Array<{
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean';
    primaryDimension: boolean;
  }>;
  rows: Array<Record<string, any>>;
  metadata: {
    notes?: string[];
  };
  confidence: number;
}
