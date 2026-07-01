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
