const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getHeaders() {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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
  const res = await fetch(`${API_URL}/analytics/pipeline-overview`, {
    headers: getHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error("Failed to fetch pipeline overview");
  return res.json();
};

export const getSourceDetail = async (sourceId: string): Promise<SourceDetail> => {
  const res = await fetch(`${API_URL}/analytics/source-detail?sourceId=${sourceId}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error("Failed to fetch source detail");
  return res.json();
};

export const getExplorerData = async (
  modelId: string,
  page: number = 1,
  pageSize: number = 50,
  source?: string,
): Promise<ExplorerResult> => {
  const params = new URLSearchParams({ modelId, page: String(page), pageSize: String(pageSize) });
  if (source) params.append('source', source);
  const res = await fetch(`${API_URL}/analytics/explorer?${params}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error("Failed to fetch explorer data");
  return res.json();
};
