const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getHeaders() {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface CanonicalModel {
  id: string;
  name: string;
  schemaJson: any;
  createdAt: string;
}

export const getCanonicalModels = async (): Promise<CanonicalModel[]> => {
  const response = await fetch(`${API_URL}/canonical-models`, {
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch canonical models");
  return response.json();
};
