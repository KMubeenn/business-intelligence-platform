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
  isActive: boolean;
  executions?: ReportExecution[];
  createdAt: string;
  updatedAt: string;
}

export async function getReports(): Promise<ReportConfig[]> {
  const res = await fetch('http://localhost:3001/reports', {
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
  });
  if (!res.ok) throw new Error('Failed to fetch reports');
  return res.json();
}

export async function createReport(data: any): Promise<ReportConfig> {
  const res = await fetch('http://localhost:3001/reports', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('access_token')}`,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create report');
  }
  return res.json();
}

export async function deleteReport(id: string): Promise<void> {
  const res = await fetch(`http://localhost:3001/reports/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
  });
  if (!res.ok) throw new Error('Failed to delete report');
}

export async function executeReport(id: string): Promise<void> {
  const res = await fetch(`http://localhost:3001/reports/${id}/execute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
  });
  if (!res.ok) throw new Error('Failed to trigger report execution');
}
