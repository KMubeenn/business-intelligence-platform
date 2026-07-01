import axios from './axios';

export interface LayoutConfig {
  primaryColor: string;
  header: {
    logoUrl: string;
    logoPosition: 'left' | 'center' | 'right';
    titleText: string;
    titlePosition: 'left' | 'center' | 'right';
    showDate: boolean;
  };
  footer: {
    disclaimerText: string;
    disclaimerPosition: 'left' | 'center' | 'right';
    signatureText: string;
    signaturePosition: 'left' | 'center' | 'right';
    showPageNumbers: boolean;
  };
}

export interface ReportTemplate {
  id: string;
  organizationId: string;
  name: string;
  isDefault: boolean;
  layoutConfig: LayoutConfig;
  createdAt: string;
  updatedAt: string;
}

export const getReportTemplates = async (): Promise<ReportTemplate[]> => {
  const response = await axios.get('/report-templates');
  return response.data;
};

export const createReportTemplate = async (data: Partial<ReportTemplate>): Promise<ReportTemplate> => {
  const response = await axios.post('/report-templates', data);
  return response.data;
};

export const updateReportTemplate = async (id: string, data: Partial<ReportTemplate>): Promise<ReportTemplate> => {
  const response = await axios.patch(`/report-templates/${id}`, data);
  return response.data;
};

export const deleteReportTemplate = async (id: string): Promise<void> => {
  await axios.delete(`/report-templates/${id}`);
};
