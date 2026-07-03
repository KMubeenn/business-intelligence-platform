"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Activity, 
  RefreshCcw, 
  Database,
  TableProperties
} from "lucide-react";
import { useRole } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { DataExplorerDialog } from "@/components/data-explorer-dialog";
import { FieldMappingDialog } from "@/components/field-mapping-dialog";
import { 
  getDataSource, 
  testConnection, 
  discoverSchema, 
  getEnabledTables, 
  enableTableSync, 
  disableTableSync,
  updateExcelDataSource
} from "@/lib/api/data-sources";
import { Input } from "@/components/ui/input";

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: string;
  configurationJson: Record<string, unknown>;
  schemaJson?: Record<string, any[]>;
}

interface RawTable {
  id: string;
  tableName: string;
  syncEnabled?: boolean;
  incrementalColumn?: string | null;
  lastSyncTimestamp?: string | null;
  primaryKeyColumn?: string | null;
}

export default function DataSourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();

  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  
  const { canManageDataSources, isViewer } = useRole();
  const [enabledTables, setEnabledTables] = useState<RawTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [excelFile, setExcelFile] = useState<File | null>(null);
  
  // Data Explorer State
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [explorerTable, setExplorerTable] = useState("");

  // Field Mapping State
  const [mappingOpen, setMappingOpen] = useState(false);
  const [mappingTable, setMappingTable] = useState("");
  const [mappingColumns, setMappingColumns] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [dsData, tablesData] = await Promise.all([
        getDataSource(id),
        getEnabledTables(id)
      ]);
      setDataSource(dsData);
      setEnabledTables(tablesData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleTestConnection = async () => {
    setActionLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await testConnection(id);
      setSuccessMsg(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDiscoverSchema = async () => {
    setActionLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      const updatedDs = await discoverSchema(id);
      setDataSource(updatedDs);
      setSuccessMsg("Schema discovered successfully!");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateExcel = async () => {
    if (!excelFile) return;
    setActionLoading(true);
    setError("");
    setSuccessMsg("");
    try {
      await updateExcelDataSource(id, excelFile);
      setSuccessMsg("Excel file updated successfully!");
      setExcelFile(null);
      // Re-discover schema in case it changed
      await handleDiscoverSchema();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setActionLoading(false);
    }
  };

  const handleToggleSync = async (tableName: string, isEnabled: boolean) => {
    try {
      if (isEnabled) {
        // Optimistic update
        setEnabledTables(prev => [...prev, { id: 'temp', tableName }]);
        await enableTableSync(id, tableName);
      } else {
        // Optimistic update
        setEnabledTables(prev => prev.filter(t => t.tableName !== tableName));
        await disableTableSync(id, tableName);
      }
      // Reload to ensure sync
      const tablesData = await getEnabledTables(id);
      setEnabledTables(tablesData);
    } catch (err: unknown) {
      alert("Failed to toggle sync: " + (err instanceof Error ? err.message : String(err)));
      // Revert on failure
      const tablesData = await getEnabledTables(id);
      setEnabledTables(tablesData);
    }
  };

  const handleSetPrimaryKey = async (tableName: string, primaryKeyColumn: string) => {
    try {
      const { updateTablePrimaryKey } = await import('@/lib/api/data-sources');
      const pkValue = primaryKeyColumn === 'NONE' ? null : primaryKeyColumn;
      await updateTablePrimaryKey(id, tableName, pkValue);
      // Update optimistic state
      setEnabledTables(prev => 
        prev.map(t => t.tableName === tableName ? { ...t, primaryKeyColumn: pkValue } : t)
      );
    } catch (err: unknown) {
      alert("Failed to set primary key: " + (err instanceof Error ? err.message : String(err)));
      // Reload on failure
      const tablesData = await getEnabledTables(id);
      setEnabledTables(tablesData);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading data source...</div>;
  }

  if (!dataSource) {
    return <div className="p-8 text-center text-destructive">Data source not found.</div>;
  }

  const tableNames = dataSource.schemaJson ? Object.keys(dataSource.schemaJson) : [];
  const enabledTableNames = new Set(enabledTables.map(t => t.tableName));

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full pt-4">
      {/* Header */}
      <div>
        <Link href="/dashboard/data-sources" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Connections
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{dataSource.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-md border border-border">
                {dataSource.type}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                dataSource.status === 'ACTIVE' 
                  ? 'bg-primary/10 text-primary border-primary/20' 
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${dataSource.status === 'ACTIVE' ? 'bg-primary' : 'bg-muted-foreground'}`}></span>
                {dataSource.status}
              </span>
            </div>
          </div>
          {canManageDataSources && (
            <div className="flex items-center gap-2">
              {dataSource.type !== 'EXCEL' && (
                <Button 
                  variant="outline" 
                  onClick={handleTestConnection} 
                  disabled={actionLoading}
                  className="bg-card text-foreground border-border hover:bg-accent"
                >
                  <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                  Test Connection
                </Button>
              )}
              <Button 
                onClick={handleDiscoverSchema} 
                disabled={actionLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCcw className={`h-4 w-4 mr-2 ${actionLoading ? 'animate-spin' : ''}`} />
                Discover Schema
              </Button>
            </div>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm border border-red-100">{error}</div>}
      {successMsg && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-md text-sm border border-emerald-200 font-medium">{successMsg}</div>}

      {dataSource.type === 'EXCEL' && canManageDataSources && (
        <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Update Excel File</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Upload a newer version of this spreadsheet to update the data snapshot. The schema will be automatically re-discovered. 
              <strong> Note:</strong> Next time sync runs, it will completely wipe and replace the old rows with the new ones (unless you map a Primary Key).
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={(e) => setExcelFile(e.target.files?.[0] || null)} 
              className="max-w-[250px] cursor-pointer" 
            />
            <Button 
              onClick={handleUpdateExcel} 
              disabled={!excelFile || actionLoading} 
              className="bg-primary text-primary-foreground min-w-[140px]"
            >
              {actionLoading && excelFile ? 'Uploading...' : 'Upload & Replace'}
            </Button>
          </div>
        </div>
      )}

      {/* Schema Section */}
      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-border flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Database Schema</h3>
            <p className="text-sm text-muted-foreground mt-1">Select the tables you want to continuously sync into the platform.</p>
          </div>
        </div>
        
        {!dataSource.schemaJson ? (
          <div className="py-16 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 mx-auto border border-border">
              <Database className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No schema discovered</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Click &quot;Discover Schema&quot; above to inspect the database and see available tables.
            </p>
          </div>
        ) : tableNames.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">No tables found in this database.</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-12 border-b border-border bg-muted/50 p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-4">Table Name</div>
              <div className="col-span-2">Columns</div>
              <div className="col-span-3">Primary Key</div>
              <div className="col-span-3 text-right">Sync Enabled</div>
            </div>
            <div className="divide-y divide-border">
              {tableNames.map((tableName) => {
                const columns = dataSource.schemaJson![tableName] || [];
                const isEnabled = enabledTableNames.has(tableName);
                const rawTable = enabledTables.find(t => t.tableName === tableName);
                
                return (
                  <div key={tableName} className="grid grid-cols-12 items-center p-4 text-sm hover:bg-muted/50 transition-colors">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted border border-border flex items-center justify-center">
                        <TableProperties className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="font-semibold text-foreground truncate pr-2">{tableName}</div>
                    </div>
                    <div className="col-span-2 text-muted-foreground font-mono text-xs">
                      {columns.length} cols
                    </div>
                    <div className="col-span-3 pr-4">
                      {isEnabled && dataSource.type === 'EXCEL' && canManageDataSources ? (
                        <select 
                          className="flex h-8 w-full max-w-[180px] items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                          value={rawTable?.primaryKeyColumn || 'NONE'}
                          onChange={(e) => handleSetPrimaryKey(tableName, e.target.value)}
                        >
                          <option value="NONE">Auto (Hash Row)</option>
                          {columns.map((c: any) => (
                            <option key={c.name} value={c.name}>{c.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-muted-foreground text-xs font-mono">
                          {rawTable?.primaryKeyColumn || (isEnabled ? 'Auto' : '-')}
                        </span>
                      )}
                    </div>
                    <div className="col-span-3 flex justify-end gap-2 sm:gap-4 items-center">
                      {isEnabled && (
                        <>
                          {canManageDataSources && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 text-primary hover:text-primary hover:bg-primary/10 whitespace-nowrap"
                              onClick={() => {
                                setMappingTable(tableName);
                                setMappingColumns(columns);
                                setMappingOpen(true);
                              }}
                            >
                              Map Fields
                            </Button>
                          )}
                          {!isViewer && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 whitespace-nowrap hidden sm:inline-flex"
                              onClick={() => {
                                setExplorerTable(tableName);
                                setExplorerOpen(true);
                              }}
                            >
                              Explorer
                            </Button>
                          )}
                        </>
                      )}
                      {canManageDataSources && (
                        <Switch 
                          checked={isEnabled} 
                          onCheckedChange={(checked) => handleToggleSync(tableName, checked)} 
                        />
                      )}
                      {!canManageDataSources && (
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {isEnabled ? 'Yes' : 'No'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <DataExplorerDialog 
        open={explorerOpen} 
        onOpenChange={setExplorerOpen}
        dataSourceId={id}
        tableName={explorerTable}
      />
      
      <FieldMappingDialog
        open={mappingOpen}
        onOpenChange={setMappingOpen}
        dataSourceId={id}
        tableName={mappingTable}
        columns={mappingColumns}
      />
    </div>
  );
}
