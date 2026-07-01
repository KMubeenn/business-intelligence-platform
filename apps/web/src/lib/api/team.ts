import api from './axios';

export const getTeamMembers = async () => {
  const { data } = await api.get('/team/members');
  return data;
};

export const inviteTeamMember = async (email: string, role: string) => {
  const { data } = await api.post('/team/invite', { email, role });
  return data;
};

export const revokeInvite = async (id: string) => {
  const { data } = await api.delete(`/team/invite/${id}`);
  return data;
};

export const removeTeamMember = async (id: string) => {
  const { data } = await api.delete(`/team/members/${id}`);
  return data;
};
