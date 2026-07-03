import api from './axios';

export interface CanonicalModel {
  id: string;
  name: string;
  schemaJson: any;
  createdAt: string;
}

export const getCanonicalModels = async (): Promise<CanonicalModel[]> => {
  const { data } = await api.get('/canonical-models');
  return data;
};

export const createCanonicalModel = async (payload: { name: string; schemaJson: any }): Promise<CanonicalModel> => {
  const { data } = await api.post('/canonical-models', payload);
  return data;
};

export const updateCanonicalModel = async (id: string, payload: { name?: string; schemaJson?: any }): Promise<CanonicalModel> => {
  const { data } = await api.put(`/canonical-models/${id}`, payload);
  return data;
};

export const deleteCanonicalModel = async (id: string): Promise<void> => {
  await api.delete(`/canonical-models/${id}`);
};
