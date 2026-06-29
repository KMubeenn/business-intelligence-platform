"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createDataSource, uploadExcelDataSource } from "@/lib/api/data-sources";

export default function NewDataSourcePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("POSTGRESQL");
  const [configStr, setConfigStr] = useState("{\n  \"host\": \"\",\n  \"port\": 5432,\n  \"user\": \"\",\n  \"password\": \"\",\n  \"database\": \"\"\n}");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setType(newType);
    if (newType === 'REST_API') {
      setConfigStr(JSON.stringify({
        baseUrl: "https://jsonplaceholder.typicode.com",
        auth: { type: "NONE" },
        endpoints: [
          {
            name: "users",
            path: "/users",
            method: "GET",
            primaryKey: "id"
          },
          {
            name: "posts",
            path: "/posts",
            method: "GET",
            primaryKey: "id",
            pagination: { type: "page", paramName: "_page", startAt: 1 }
          }
        ]
      }, null, 2));
    } else if (newType === 'EXCEL') {
      setConfigStr("");
    } else {
      setConfigStr("{\n  \"host\": \"\",\n  \"port\": 5432,\n  \"user\": \"\",\n  \"password\": \"\",\n  \"database\": \"\"\n}");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (type === 'EXCEL') {
        if (!excelFile) throw new Error("Please select an Excel file to upload");
        await uploadExcelDataSource(excelFile, name);
      } else {
        let configurationJson;
        try {
          configurationJson = JSON.parse(configStr);
        } catch (err) {
          throw new Error("Invalid JSON configuration");
        }
        await createDataSource({ name, type, configurationJson });
      }
      
      router.push("/dashboard/data-sources");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl w-full">
      <Card>
        <CardHeader>
          <CardTitle>New Data Source</CardTitle>
          <CardDescription>Add a new database or service connection</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-6">
            {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}
            
            <div className="grid gap-2">
              <Label htmlFor="name">Connection Name</Label>
              <Input
                id="name"
                placeholder="e.g. Production Read Replica"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Source Type</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={type}
                onChange={handleTypeChange}
                required
              >
                <option value="POSTGRESQL">PostgreSQL</option>
                <option value="MYSQL">MySQL</option>
                <option value="REST_API">REST API</option>
                <option value="SHOPIFY">Shopify</option>
                <option value="EXCEL">Excel File (.xlsx)</option>
              </select>
            </div>

            {type !== 'EXCEL' ? (
              <div className="grid gap-2">
                <Label htmlFor="config">Configuration (JSON)</Label>
                <textarea
                  id="config"
                  className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                  value={configStr}
                  onChange={(e) => setConfigStr(e.target.value)}
                  required={type !== 'EXCEL'}
                />
                <p className="text-xs text-muted-foreground">Enter connection details in JSON format.</p>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="file">Excel File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                  required={type === 'EXCEL'}
                />
                <p className="text-xs text-muted-foreground">Upload your spreadsheet data.</p>
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Connection"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
