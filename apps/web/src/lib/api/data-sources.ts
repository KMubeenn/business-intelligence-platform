const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
/* eslint-disable @typescript-eslint/no-explicit-any */
function getHeaders() {
  const token = localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getDataSources() {
  const res = await fetch(`${API_URL}/data-sources`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch data sources");
  return res.json();
}

export async function getDataSource(id: string) {
  const res = await fetch(`${API_URL}/data-sources/${id}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch data source");
  return res.json();
}

export async function createDataSource(data: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/data-sources`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create data source");
  return res.json();
}

export async function uploadExcelDataSource(file: File, name: string) {
  const token = localStorage.getItem("access_token");
  const formData = new FormData();
  formData.append("file", file);
  if (name) formData.append("name", name);

  const res = await fetch(`${API_URL}/data-sources/upload-excel`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Do NOT set Content-Type to application/json, browser sets multipart/form-data automatically
    },
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to upload Excel file");
  return res.json();
}

export async function updateDataSource(id: string, data: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/data-sources/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update data source");
  return res.json();
}

export async function deleteDataSource(id: string) {
  const res = await fetch(`${API_URL}/data-sources/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete data source");
  return res.json();
}

export async function testConnection(id: string) {
  const res = await fetch(`${API_URL}/data-sources/${id}/test`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Connection test failed");
  return res.json();
}

export async function discoverSchema(id: string) {
  const res = await fetch(`${API_URL}/data-sources/${id}/schema/discover`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Schema discovery failed");
  return res.json();
}

export async function getEnabledTables(id: string) {
  const res = await fetch(`${API_URL}/data-sources/${id}/tables`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch enabled tables");
  return res.json();
}

export async function enableTableSync(id: string, tableName: string) {
  const res = await fetch(`${API_URL}/data-sources/${id}/tables`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ tableName }),
  });
  if (!res.ok) throw new Error("Failed to enable table sync");
  return res.json();
}

export async function disableTableSync(id: string, tableName: string) {
  const res = await fetch(`${API_URL}/data-sources/${id}/tables/${tableName}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to disable table sync");
  return res.json();
}

export async function getRawRecords(id: string, tableName: string) {
  const res = await fetch(`${API_URL}/data-sources/${id}/tables/${tableName}/records`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch records");
  return res.json();
}

export async function getCanonicalModels() {
  const res = await fetch(`${API_URL}/canonical-models`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch canonical models");
  return res.json();
}

export async function getFieldMapping(id: string, tableName: string) {
  const res = await fetch(`${API_URL}/data-sources/${id}/tables/${tableName}/mappings`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch field mapping");
  return res.json();
}

export async function updateFieldMapping(id: string, tableName: string, canonicalModelId: string, mappingRules: any) {
  const res = await fetch(`${API_URL}/data-sources/${id}/tables/${tableName}/mappings`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ canonicalModelId, mappingRules }),
  });
  if (!res.ok) throw new Error("Failed to update field mapping");
  return res.json();
}
