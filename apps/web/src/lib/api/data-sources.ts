import api from './axios';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function getDataSources() {
  const { data } = await api.get('/data-sources');
  return data;
}

export async function getDataSource(id: string) {
  const { data } = await api.get(`/data-sources/${id}`);
  return data;
}

export async function createDataSource(payload: Record<string, unknown>) {
  const { data } = await api.post('/data-sources', payload);
  return data;
}

export async function uploadExcelDataSource(file: File, name: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (name) formData.append("name", name);

  // Using native fetch for FormData to avoid Axios boundary issues sometimes, 
  // or we can use axios but ensure headers are correct. Axios handles FormData nicely!
  const { data } = await api.post('/data-sources/upload-excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  });
  return data;
}

export async function updateDataSource(id: string, payload: Record<string, unknown>) {
  const { data } = await api.put(`/data-sources/${id}`, payload);
  return data;
}

export async function deleteDataSource(id: string) {
  const { data } = await api.delete(`/data-sources/${id}`);
  return data;
}

export async function testConnection(id: string) {
  const { data } = await api.post(`/data-sources/${id}/test`);
  return data;
}

export async function discoverSchema(id: string) {
  const { data } = await api.post(`/data-sources/${id}/schema/discover`);
  return data;
}

export async function getEnabledTables(id: string) {
  const { data } = await api.get(`/data-sources/${id}/tables`);
  return data;
}

export async function enableTableSync(id: string, tableName: string) {
  const { data } = await api.post(`/data-sources/${id}/tables`, { tableName });
  return data;
}

export async function disableTableSync(id: string, tableName: string) {
  const { data } = await api.delete(`/data-sources/${id}/tables/${tableName}`);
  return data;
}

export async function getRawRecords(id: string, tableName: string) {
  const { data } = await api.get(`/data-sources/${id}/tables/${tableName}/records`);
  return data;
}

export async function getCanonicalModels() {
  const { data } = await api.get('/canonical-models');
  return data;
}

export async function getFieldMapping(id: string, tableName: string) {
  const { data } = await api.get(`/data-sources/${id}/tables/${tableName}/mappings`);
  return data;
}

export async function updateFieldMapping(id: string, tableName: string, canonicalModelId: string, mappingRules: any) {
  const { data } = await api.put(`/data-sources/${id}/tables/${tableName}/mappings`, { canonicalModelId, mappingRules });
  return data;
}
