"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getRawRecords } from "@/lib/api/data-sources";
import { Database, Loader2, Sparkles } from "lucide-react";

interface DataExplorerDialogProps {
  dataSourceId: string;
  tableName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataExplorerDialog({
  dataSourceId,
  tableName,
  open,
  onOpenChange,
}: DataExplorerDialogProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    if (!open) return;
    
    let isMounted = true;
    setLoading(true);
    setError("");
    setPage(1);

    getRawRecords(dataSourceId, tableName)
      .then((data) => {
        if (isMounted) {
          setRecords(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load data");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [dataSourceId, tableName, open]);

  // Extract all unique keys from the JSON data to use as headers
  const getHeaders = (useCanonical: boolean) => {
    if (records.length === 0) return [];
    const keySet = new Set<string>();
    records.forEach((record) => {
      const dataObj = useCanonical ? record.canonicalRecord?.data : record.data;
      if (dataObj && typeof dataObj === 'object') {
        Object.keys(dataObj).forEach(k => keySet.add(k));
      }
    });
    return Array.from(keySet);
  };

  const rawHeaders = getHeaders(false);
  const canonicalHeaders = getHeaders(true);

  const totalPages = Math.ceil(records.length / PAGE_SIZE);
  const paginatedRecords = records.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-muted-foreground" />
            Data Explorer: <span className="font-mono bg-muted px-2 py-0.5 rounded text-sm text-foreground">{tableName}</span>
          </DialogTitle>
          <DialogDescription>
            Previewing the latest records synced from the data source.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 mt-4 relative flex flex-col h-full min-h-[400px] overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10 border border-border rounded-md">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="text-sm font-medium">Fetching records...</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive border border-border rounded-md">{error}</div>
          ) : records.length === 0 ? (
            <div className="p-16 text-center border border-border rounded-md">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 border border-border">
                <Database className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No Data Synced Yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                The sync job runs every 30 seconds. Wait a moment and try reopening the explorer.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="raw" className="flex flex-col h-full overflow-hidden">
              <TabsList className="w-fit mb-4 shrink-0">
                <TabsTrigger value="raw" className="gap-2">
                  <Database className="h-4 w-4" />
                  Raw Schema
                </TabsTrigger>
                <TabsTrigger value="canonical" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Standardized Schema
                </TabsTrigger>
              </TabsList>

              <TabsContent value="raw" className="flex-1 overflow-auto border border-border rounded-md m-0 data-[state=active]:flex flex-col bg-card">
                <div className="overflow-x-auto min-w-full">
                  <Table className="min-w-max">
                    <TableHeader className="bg-muted/80 sticky top-0 z-10 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="w-[100px] font-semibold text-xs border-r whitespace-nowrap">_sync_id</TableHead>
                        <TableHead className="w-[180px] font-semibold text-xs border-r whitespace-nowrap">_synced_at</TableHead>
                        {rawHeaders.map(header => (
                          <TableHead key={header} className="font-semibold text-xs whitespace-nowrap">{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRecords.map((record) => (
                        <TableRow key={record.id} className="group hover:bg-muted/50">
                          <TableCell className="font-mono text-xs text-muted-foreground border-r group-hover:text-foreground transition-colors whitespace-nowrap">
                            {record.id.split('-')[0]}...
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground border-r whitespace-nowrap">
                            {new Date(record.createdAt).toLocaleString()}
                          </TableCell>
                          {rawHeaders.map(header => {
                            const val = record.data?.[header];
                            const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-');
                            return (
                              <TableCell key={`${record.id}-${header}`} className="text-foreground max-w-[300px] truncate" title={displayVal}>
                                {displayVal}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="canonical" className="flex-1 overflow-auto border border-border rounded-md m-0 data-[state=active]:flex flex-col bg-background">
                <div className="overflow-x-auto min-w-full">
                  <Table className="min-w-max">
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-[0_1px_2px_0_rgba(255,255,255,0.05)] backdrop-blur-sm">
                      <TableRow className="hover:bg-transparent border-border">
                        <TableHead className="w-[120px] font-semibold text-xs text-primary border-r border-border whitespace-nowrap">_status</TableHead>
                        <TableHead className="w-[180px] font-semibold text-xs text-primary border-r border-border whitespace-nowrap">_transformed_at</TableHead>
                        {canonicalHeaders.map(header => (
                          <TableHead key={header} className="font-semibold text-xs text-primary whitespace-nowrap">{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedRecords.map((record) => {
                        const cRec = record.canonicalRecord;
                        if (!cRec) {
                          return (
                            <TableRow key={record.id} className="bg-muted/20 hover:bg-muted/20 border-border">
                              <TableCell colSpan={canonicalHeaders.length + 2} className="text-center text-muted-foreground italic text-xs h-24">
                                Pending Transformation...
                              </TableCell>
                            </TableRow>
                          );
                        }
                        return (
                          <TableRow key={cRec.id} className="hover:bg-muted/30 border-border transition-colors">
                            <TableCell className="border-r border-border whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-500 ring-1 ring-inset ring-emerald-500/20">
                                {cRec.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground border-r border-border font-medium whitespace-nowrap">
                              {new Date(cRec.createdAt).toLocaleString()}
                            </TableCell>
                            {canonicalHeaders.map(header => {
                              const val = cRec.data?.[header];
                              const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-');
                              return (
                                <TableCell key={`${cRec.id}-${header}`} className="text-foreground font-medium max-w-[300px] truncate" title={displayVal}>
                                  {displayVal}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-4 px-2 shrink-0">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium text-foreground">{(page - 1) * PAGE_SIZE + 1}</span> to <span className="font-medium text-foreground">{Math.min(page * PAGE_SIZE, records.length)}</span> of <span className="font-medium text-foreground">{records.length}</span> records
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm bg-muted rounded-md disabled:opacity-50 hover:bg-muted/80 transition-colors"
                  >
                    Previous
                  </button>
                  <div className="text-sm px-2">
                    Page {page} of {totalPages}
                  </div>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1 text-sm bg-muted rounded-md disabled:opacity-50 hover:bg-muted/80 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
