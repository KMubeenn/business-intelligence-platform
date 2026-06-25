"use client";

import { useEffect, useState, useCallback } from "react";
import { getPipelineOverview, getSourceDetail, PipelineOverview, SourceDetail, ConnectorHealth } from "@/lib/api/pipeline";
import { getOverallMetrics, OverallMetrics } from "@/lib/api/analytics";
import {
  MetricCard, ConnectorHealthTable, SyncActivityChart, TableStatusGrid,
  RecordsBreakdownChart, SourceVolumeChart
} from "@/components/dashboard-charts";
import { Database, Layers, BarChart3, ArrowLeft, RefreshCw, Clock } from "lucide-react";

type View = 'overview' | 'source-detail';

export default function Dashboard() {
  const [view, setView] = useState<View>('overview');
  const [metrics, setMetrics] = useState<OverallMetrics | null>(null);
  const [overview, setOverview] = useState<PipelineOverview | null>(null);
  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [m, o] = await Promise.all([getOverallMetrics(), getPipelineOverview()]);
      setMetrics(m);
      setOverview(o);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to load overview", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => loadOverview(true), 30000);
    return () => clearInterval(interval);
  }, [loadOverview]);

  const handleConnectorSelect = async (c: ConnectorHealth) => {
    setSelectedConnector(c);
    setView('source-detail');
    setDetail(null);
    try {
      const d = await getSourceDetail(c.id);
      setDetail(d);
    } catch (err) {
      console.error("Failed to load source detail", err);
    }
  };

  const handleBack = () => {
    setView('overview');
    setDetail(null);
    setSelectedConnector(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading Pipeline Overview...</p>
      </div>
    );
  }

  // ─── SOURCE DETAIL VIEW ───
  if (view === 'source-detail' && selectedConnector) {
    return (
      <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pt-4 pb-12">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Overview
          </button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground">{selectedConnector.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {selectedConnector.type} &nbsp;·&nbsp; {selectedConnector.tableCount} tables syncing
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <MetricCard
            title="Total Records"
            value={selectedConnector.totalRecords.toLocaleString()}
            icon={Database}
            accent="indigo"
            description="Stored in raw ingestion layer"
          />
          <MetricCard
            title="Tables Syncing"
            value={selectedConnector.tableCount}
            icon={Layers}
            accent="emerald"
            description="With sync enabled"
          />
          <MetricCard
            title="Last Sync"
            value={selectedConnector.lastSyncAt
              ? new Date(selectedConnector.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Never'}
            icon={Clock}
            accent="amber"
            description={selectedConnector.lastSyncAt
              ? new Date(selectedConnector.lastSyncAt).toLocaleDateString()
              : 'No sync recorded'}
          />
        </div>

        {/* Table Status Grid */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">Table Status</h2>
          {detail ? (
            <TableStatusGrid tables={detail.tables} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-44 rounded-xl border border-border/50 bg-card/40 animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── OVERVIEW VIEW ───
  const healthyCnt = overview?.connectors.filter(c => c.status === 'healthy').length ?? 0;
  const totalCnt = overview?.connectors.length ?? 0;
  const syncRate = totalCnt > 0 ? Math.round((healthyCnt / totalCnt) * 100) : 0;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full pt-4 pb-12">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground">Command Center</h1>
          <p className="text-muted-foreground mt-1">Real-time pipeline health and ingestion observability.</p>
        </div>
        <button
          onClick={() => loadOverview(true)}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-border/50 rounded-lg px-3 py-2 hover:bg-muted/30 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : `Updated ${lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
        </button>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Active Connectors"
          value={metrics?.totalSources ?? 0}
          icon={Database}
          accent="indigo"
          description="Connected data sources"
        />
        <MetricCard
          title="Golden Schemas"
          value={metrics?.totalModels ?? 0}
          icon={Layers}
          accent="purple"
          description="Canonical data models"
        />
        <MetricCard
          title="Normalized Volume"
          value={(metrics?.totalNormalizedRecords ?? 0).toLocaleString()}
          icon={BarChart3}
          accent="emerald"
          description="Total records in golden layer"
        />
        <MetricCard
          title="Sync Health"
          value={`${syncRate}%`}
          icon={Clock}
          accent="amber"
          description={`${healthyCnt} of ${totalCnt} connectors active`}
        />
      </div>

      {/* Two-column insight charts */}
      {metrics && overview && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecordsBreakdownChart data={metrics.modelsBreakdown} />
          <SourceVolumeChart connectors={overview.connectors} />
        </div>
      )}

      {/* Sync Activity Chart */}
      {overview && (
        <SyncActivityChart
          data={overview.syncActivity}
          sourceNames={overview.sourceNames}
        />
      )}

      {/* Connector Health Table */}
      {overview && (
        <ConnectorHealthTable
          connectors={overview.connectors}
          onSelect={handleConnectorSelect}
        />
      )}
    </div>
  );
}
