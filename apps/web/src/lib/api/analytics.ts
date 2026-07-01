import api from './axios';

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
  const { data } = await api.get('/analytics/summary');
  return data;
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

  const { data } = await api.get(`/analytics/query?${params.toString()}`);
  return data;
};
