"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Settings2, Trash2, Database, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDataSources, deleteDataSource } from "@/lib/api/data-sources";

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  configurationJson: Record<string, unknown>;
}

export default function DataSourcesPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDataSources = async () => {
    try {
      setLoading(true);
      const data = await getDataSources();
      setDataSources(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataSources();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this data source?")) return;
    try {
      await deleteDataSource(id);
      await loadDataSources();
    } catch (err: unknown) {
      alert("Failed to delete: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Data Sources</h1>
          <p className="text-zinc-500 mt-1">Manage your database connections and integration settings.</p>
        </div>
        <Link href="/dashboard/data-sources/new">
          <Button className="gap-2 bg-zinc-950 text-white hover:bg-zinc-800 rounded-md">
            <Plus className="h-4 w-4" />
            New Connection
          </Button>
        </Link>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-zinc-500 text-sm font-medium">Loading connections...</div>
        ) : error ? (
          <div className="py-12 text-center text-red-500 text-sm font-medium">{error}</div>
        ) : dataSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mb-4 border border-zinc-200">
              <Database className="h-6 w-6 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-950">No connections found</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-6 max-w-sm">
              Connect a database or API integration to start syncing your data to the platform.
            </p>
            <Link href="/dashboard/data-sources/new">
              <Button className="bg-zinc-950 text-white hover:bg-zinc-800 rounded-md">Connect Data Source</Button>
            </Link>
          </div>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-5 border-b border-zinc-200 bg-zinc-50/50 p-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <div className="col-span-2">Name</div>
              <div>Type</div>
              <div>Status</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-zinc-200">
              {dataSources.map((ds) => (
                <div key={ds.id} className="grid grid-cols-5 items-center p-4 text-sm hover:bg-zinc-50 transition-colors">
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center">
                      <LayoutGrid className="h-4 w-4 text-zinc-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-zinc-950">{ds.name}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">{ds.id.split('-')[0]}...</div>
                    </div>
                  </div>
                  <div className="font-medium text-zinc-700">{ds.type}</div>
                  <div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${ds.status === 'ACTIVE'
                      ? 'bg-zinc-100 text-zinc-900 border-zinc-200'
                      : 'bg-white text-zinc-500 border-zinc-200'
                      }`}>
                      <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${ds.status === 'ACTIVE' ? 'bg-zinc-900' : 'bg-zinc-300'}`}></span>
                      {ds.status}
                    </span>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Link href={`/dashboard/data-sources/${ds.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100">
                        <Settings2 className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(ds.id)}
                      className="h-8 w-8 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
