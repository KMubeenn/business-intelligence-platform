export interface UniversalDataset {
  datasetId: string;           
  source: string;              
  sourceFile: string;          
  sheet: string;               
  datasetName: string;         
  schema: {
    columns: Array<{
      name: string;
      normalizedName: string;  
      type: 'string' | 'number' | 'date' | 'boolean';
      primaryDimension: boolean;
    }>;
  };
  rows: Array<Record<string, any>>; 
  metadata: {
    titleRegion?: string;
    notes?: string[];
  };
  quality: {
    warnings: string[];
    correctionsApplied: string[];
  };
  confidence: number;          
}
