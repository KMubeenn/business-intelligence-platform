"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, CheckCircle2, Clock, AlertCircle, Database, GitBranch, Activity, BarChart3, PieChart as PieChartIcon } from "lucide-react";
import { ConnectorHealth, TableHealth } from "@/lib/api/pipeline";

// ─────────────────────────────────────────────
// Shared palette — consistent across all charts
// ─────────────────────────────────────────────
export const CHART_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#2dd4bf', '#fb7185', '#60a5fa'];

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────
export function StatusBadge({ status }: { status: ConnectorHealth['status'] }) {
  const cfg = {
    healthy:  { label: 'Syncing',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
    idle:     { label: 'Idle',      cls: 'bg-amber-500/15   text-amber-400   border-amber-500/30',   dot: 'bg-amber-400' },
    no_data:  { label: 'No Data',   cls: 'bg-zinc-500/15    text-zinc-400    border-zinc-500/30',    dot: 'bg-zinc-400' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${status === 'healthy' ? 'animate-pulse' : ''}`} />
      {cfg.label}
    </span>
  );
}

// ─────────────────────────────────────────────
// METRIC CARD
// ─────────────────────────────────────────────
export function MetricCard({
  title, value, description, icon: Icon, accent = 'indigo'
}: {
  title: string; value: string | number; description?: string; icon?: any; accent?: string;
}) {
  const accents: Record<string, string> = {
    indigo: 'from-indigo-500/10',
    emerald: 'from-emerald-500/10',
    amber: 'from-amber-500/10',
    purple: 'from-purple-500/10',
  };
  const iconAccents: Record<string, string> = {
    indigo: 'text-indigo-400 bg-indigo-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 hover:shadow-lg transition-all duration-300 group`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${accents[accent] || accents.indigo} to-transparent opacity-60`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-black tracking-tight text-foreground mt-1">{value}</p>
          {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconAccents[accent] || iconAccents.indigo}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SYNC ACTIVITY CHART (the ONE sensible chart)
// ─────────────────────────────────────────────
export function SyncActivityChart({
  data, sourceNames
}: {
  data: Record<string, any>[];
  sourceNames: string[];
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <TrendingUp className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Sync Activity — Last 24h</h3>
          <p className="text-xs text-muted-foreground">Rows ingested per hour, per connector</p>
        </div>
      </div>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
          No sync activity in the last 24 hours
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                {sourceNames.map((name, i) => (
                  <linearGradient key={name} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#27272a" opacity={0.5} />
              <XAxis dataKey="hour" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(18,18,20,0.95)', borderColor: '#27272a', borderRadius: '10px', fontSize: '13px', color: '#e4e4e7', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                cursor={{ stroke: '#3f3f46', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#a1a1aa', paddingBottom: '8px' }} />
              {sourceNames.map((name, i) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  fill={`url(#grad-${i})`}
                  fillOpacity={1}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#18181b' }}
                  connectNulls
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// CONNECTOR HEALTH TABLE
// ─────────────────────────────────────────────
function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TYPE_LABELS: Record<string, string> = {
  MYSQL: 'MySQL',
  POSTGRES: 'PostgreSQL',
  REST_API: 'REST API',
};

export function ConnectorHealthTable({
  connectors,
  onSelect,
}: {
  connectors: ConnectorHealth[];
  onSelect: (c: ConnectorHealth) => void;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-border/50 bg-muted/20">
        <div className="p-1.5 bg-emerald-500/10 rounded-md">
          <Activity className="h-4 w-4 text-emerald-400" />
        </div>
        <h3 className="font-semibold text-foreground">Connector Health</h3>
        <span className="ml-auto text-xs text-muted-foreground">{connectors.length} connections</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/10">
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Connector</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tables</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Records</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Sync</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {connectors.map(c => (
              <tr
                key={c.id}
                onClick={() => onSelect(c)}
                className="hover:bg-muted/30 cursor-pointer transition-colors group"
              >
                <td className="px-6 py-4">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Database className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-mono bg-muted/50 px-2 py-1 rounded text-muted-foreground">
                    {TYPE_LABELS[c.type] || c.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-mono text-sm text-foreground/80">{c.tableCount}</td>
                <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-foreground">{c.totalRecords.toLocaleString()}</td>
                <td className="px-6 py-4 text-right text-sm text-muted-foreground">{timeAgo(c.lastSyncAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TABLE STATUS GRID (Source Detail)
// ─────────────────────────────────────────────
export function TableStatusGrid({ tables }: { tables: TableHealth[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tables.map(t => (
        <div
          key={t.id}
          className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm text-foreground">{t.tableName}</span>
            </div>
            <StatusBadge status={t.recordCount > 0 ? (t.lastSyncAt && (Date.now() - new Date(t.lastSyncAt).getTime()) < 7200000 ? 'healthy' : 'idle') : 'no_data'} />
          </div>
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Records</span>
              <span className="font-mono font-semibold text-foreground">{t.recordCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Last sync</span>
              <span className="text-foreground/80">{timeAgo(t.lastSyncAt)}</span>
            </div>
            {t.primaryKeyColumn && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Primary key</span>
                <span className="font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">{t.primaryKeyColumn}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border/30 mt-2">
              <span className="text-muted-foreground">Golden Schema</span>
              {t.mappedTo ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {t.mappedTo}
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Unmapped
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// RECORDS BY MODEL (Horizontal Bar Chart)
// ─────────────────────────────────────────────
export function RecordsBreakdownChart({ data }: { data: { name: string; records: number }[] }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-emerald-500/10 rounded-lg">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Records by Golden Schema</h3>
          <p className="text-xs text-muted-foreground">Total normalized records per canonical model</p>
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#27272a" opacity={0.5} />
            <XAxis
              type="number"
              stroke="#52525b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => v.toLocaleString()}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#52525b"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(18,18,20,0.95)', borderColor: '#27272a', borderRadius: '10px', fontSize: '13px', color: '#e4e4e7' }}
              formatter={(v: any) => [Number(v).toLocaleString(), 'Records']}
              cursor={{ fill: '#27272a', opacity: 0.4 }}
            />
            <Bar dataKey="records" radius={[0, 6, 6, 0]} maxBarSize={36}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SOURCE VOLUME (Donut Chart)
// ─────────────────────────────────────────────
interface SourceVolume { name: string; totalRecords: number; }

export function SourceVolumeChart({ connectors }: { connectors: SourceVolume[] }) {
  const data = connectors.filter(c => c.totalRecords > 0).map(c => ({ name: c.name, value: c.totalRecords }));

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-purple-500/10 rounded-lg">
          <PieChartIcon className="h-4 w-4 text-purple-400" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Source Volume Share</h3>
          <p className="text-xs text-muted-foreground">Raw records contributed per connector</p>
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={renderCustomLabel}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(18,18,20,0.95)', borderColor: '#27272a', borderRadius: '10px', fontSize: '13px', color: '#e4e4e7' }}
              formatter={(v: any) => [Number(v).toLocaleString(), 'Records']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 justify-center">
        {data.map((entry, i) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            {entry.name}
          </div>
        ))}
      </div>
    </div>
  );
}
