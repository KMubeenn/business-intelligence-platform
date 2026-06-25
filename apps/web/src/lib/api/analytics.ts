const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getHeaders() {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface OverallMetrics {
  totalSources: number;
  totalModels: number;
  totalNormalizedRecords: number;
  modelsBreakdown: { name: string; records: number }[];
}

export interface AggregationResult {
  type: 'raw' | 'aggregated';
  data: any[];
}

export const getOverallMetrics = async (): Promise<OverallMetrics> => {
  const response = await fetch(`${API_URL}/analytics/summary`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch analytics summary");
  return response.json();
};

export const getAggregatedData = async (
  modelId: string,
  groupBy?: string,
  metricField?: string,
  metricType?: 'sum' | 'count' | 'avg'
): Promise<AggregationResult> => {
  const params = new URLSearchParams({ modelId, _t: Date.now().toString() });
  if (groupBy) params.append('groupBy', groupBy);
  if (metricField) params.append('metricField', metricField);
  if (metricType) params.append('metricType', metricType);

  const response = await fetch(`${API_URL}/analytics/query?${params.toString()}`, {
    headers: getHeaders(),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error("Failed to fetch aggregated data");
  return response.json();
};
