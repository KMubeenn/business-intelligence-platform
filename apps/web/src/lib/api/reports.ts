import api from './axios';

export interface ReportExecution {
  id: string;
  reportConfigId: string;
  status: string;
  pdfUrl?: string;
  errorMessage?: string;
  executedAt: string;
}

export interface ReportConfig {
  id: string;
  name: string;
  userQuery: string;
  cronSchedule: string;
  targetEmails: string[];
  includedModels: string[];
  templateId?: string;
  isActive: boolean;
  executions?: ReportExecution[];
  createdAt: string;
  updatedAt: string;
}

export async function getReports(): Promise<ReportConfig[]> {
  const { data } = await api.get('/reports');
  return data;
}

export async function createReport(payload: any): Promise<ReportConfig> {
  const { data } = await api.post('/reports', payload);
  return data;
}

export async function deleteReport(id: string): Promise<void> {
  await api.delete(`/reports/${id}`);
}

export async function executeReport(id: string): Promise<void> {
  await api.post(`/reports/${id}/execute`);
}

export async function updateReport(id: string, payload: any): Promise<ReportConfig> {
  const { data } = await api.put(`/reports/${id}`, payload);
  return data;
}
