import api from './axios';

export interface ConnectorHealth {
  id: string;
  name: string;
  type: string;
  status: 'healthy' | 'idle' | 'no_data';
  tableCount: number;
  totalRecords: number;
  lastSyncAt: string | null;
}

export interface TableHealth {
  id: string;
  tableName: string;
  recordCount: number;
  lastSyncAt: string | null;
  primaryKeyColumn: string | null;
  incrementalColumn: string | null;
  mappedTo: string | null;
}

export interface PipelineOverview {
  connectors: ConnectorHealth[];
  syncActivity: Record<string, any>[];
  sourceNames: string[];
  totalSynced24h: number;
}

export interface SourceDetail {
  id: string;
  name: string;
  type: string;
  tables: TableHealth[];
}

export interface ExplorerResult {
  records: Record<string, any>[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const getPipelineOverview = async (): Promise<PipelineOverview> => {
  const { data } = await api.get('/analytics/pipeline-overview');
  return data;
};

export const getSourceDetail = async (sourceId: string): Promise<SourceDetail> => {
  const { data } = await api.get(`/analytics/source-detail?sourceId=${sourceId}`);
  return data;
};

export const getExplorerData = async (
  modelId: string,
  page: number = 1,
  pageSize: number = 50,
  source?: string,
): Promise<ExplorerResult> => {
  const params = new URLSearchParams({ modelId, page: String(page), pageSize: String(pageSize) });
  if (source) params.append('source', source);
  
  const { data } = await api.get(`/analytics/explorer?${params}`);
  return data;
};
