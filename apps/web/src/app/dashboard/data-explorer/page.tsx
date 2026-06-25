"use client";

import { useEffect, useState, useCallback } from "react";
import { getCanonicalModels, CanonicalModel } from "@/lib/api/canonical-models";
import { getExplorerData } from "@/lib/api/pipeline";
import { Search, ChevronLeft, ChevronRight, Filter, Download, Database } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function getDataSources(): Promise<{ id: string; name: string }[]> {
  const token = typeof window !== 'undefined' ? localStorage.getItem("access_token") : null;
  const res = await fetch(`${API_URL}/data-sources`, {
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) return [];
  return res.json();
}

export default function DataExplorerPage() {
  const [models, setModels] = useState<CanonicalModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const PAGE_SIZE = 50;

  useEffect(() => {
    Promise.all([getCanonicalModels(), getDataSources()]).then(([m, sources]) => {
      setModels(m);
      if (m.length > 0) setSelectedModel(m[0].id);
      setAvailableSources(sources.map(s => s.name));
      setLoading(false);
    });
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedModel) return;
    setDataLoading(true);
    try {
      const result = await getExplorerData(
        selectedModel,
        page,
        PAGE_SIZE,
        sourceFilter || undefined,
      );
      setRecords(result.records);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error("Failed to load explorer data", err);
    } finally {
      setDataLoading(false);
    }
  }, [selectedModel, page, sourceFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset page when model/filter changes
  useEffect(() => { setPage(1); }, [selectedModel, sourceFilter]);

  const columns = records.length > 0
    ? Object.keys(records[0]).filter(k => !k.startsWith('_'))
    : [];

  const displayColumns = ['_source', ...columns, '_syncedAt'];

  // Client-side search filter (searches visible page)
  const filtered = search
    ? records.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(search.toLowerCase())))
    : records;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (models.length === 0) {
    return (
      <div className="max-w-7xl mx-auto pt-8 text-center">
        <h2 className="text-2xl font-bold">No Golden Schemas Found</h2>
        <p className="text-muted-foreground mt-2">Create a Canonical Model and map data sources to explore records.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-full pb-12">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Data Explorer</h1>
          <p className="text-muted-foreground mt-1">Browse and inspect normalized canonical records.</p>
        </div>
        <button
          className="flex items-center gap-2 text-sm border border-border/50 text-muted-foreground hover:text-foreground rounded-lg px-4 py-2 hover:bg-muted/30 transition-all"
          onClick={() => {
            const csv = [
              displayColumns.join(','),
              ...filtered.map(r => displayColumns.map(k => JSON.stringify(r[k] ?? '')).join(','))
            ].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
            a.download = `export-${selectedModel}-page${page}.csv`; a.click();
          }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm">
        {/* Model Tabs */}
        <div className="flex items-center gap-2">
          {models.map(m => (
            <button
              key={m.id}
              onClick={() => { setSelectedModel(m.id); setSourceFilter(""); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedModel === m.id
                  ? 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30'
                  : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-border/50 mx-1" />

        {/* Source Filter */}
        {availableSources.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="text-sm bg-muted/40 border border-border/40 rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Sources</option>
              {availableSources.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search on this page..."
            className="pl-9 pr-4 py-1.5 text-sm bg-muted/40 border border-border/40 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-56"
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground px-1">
        <span>
          <span className="text-foreground font-semibold">{total.toLocaleString()}</span> total records
        </span>
        <span>
          Page <span className="text-foreground font-semibold">{page}</span> of <span className="text-foreground font-semibold">{totalPages}</span>
        </span>
        {sourceFilter && (
          <span>
            Filtered by: <span className="text-indigo-400 font-medium">{sourceFilter}</span>
            <button onClick={() => setSourceFilter("")} className="ml-2 text-xs text-muted-foreground hover:text-foreground">✕ clear</button>
          </span>
        )}
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {dataLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Search className="h-8 w-8 mb-3 opacity-40" />
              <p>No records found for the current filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border/50 bg-muted/20">
                <tr>
                  {displayColumns.map(col => (
                    <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                      {col.startsWith('_') ? col.slice(1) : col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/20 transition-colors">
                    {displayColumns.map(col => {
                      const val = row[col];
                      const isSource = col === '_source';
                      const isDate = col === '_syncedAt';

                      return (
                        <td key={col} className="px-4 py-3 whitespace-nowrap text-xs">
                          {isSource ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {String(val ?? '—')}
                            </span>
                          ) : isDate ? (
                            <span className="text-muted-foreground">
                              {val ? new Date(val).toLocaleString() : '—'}
                            </span>
                          ) : (
                            <span className="text-foreground/90">
                              {val === null || val === undefined ? <span className="text-muted-foreground/50">null</span> : String(val)}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || dataLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-border/50 hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p = page <= 4 ? i + 1 : page + i - 3;
                if (p < 1 || p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-8 w-8 rounded-lg text-xs font-medium transition-all ${
                      p === page
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || dataLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-border/50 hover:bg-muted/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
