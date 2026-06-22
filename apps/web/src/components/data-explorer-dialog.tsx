"use client";

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

  useEffect(() => {
    if (!open) return;
    
    let isMounted = true;
    setLoading(true);
    setError("");

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-zinc-500" />
            Data Explorer: <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded text-sm text-zinc-800">{tableName}</span>
          </DialogTitle>
          <DialogDescription>
            Previewing the latest records synced from the data source.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 mt-4 relative flex flex-col h-full min-h-[400px]">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-50/50 backdrop-blur-sm z-10 border border-zinc-200 rounded-md">
              <div className="flex flex-col items-center gap-2 text-zinc-500">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                <span className="text-sm font-medium">Fetching records...</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 border border-zinc-200 rounded-md">{error}</div>
          ) : records.length === 0 ? (
            <div className="p-16 text-center border border-zinc-200 rounded-md">
              <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-4 border border-zinc-200">
                <Database className="h-6 w-6 text-zinc-400" />
              </div>
              <h3 className="text-lg font-medium text-zinc-900">No Data Synced Yet</h3>
              <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
                The sync job runs every 30 seconds. Wait a moment and try reopening the explorer.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="raw" className="flex flex-col h-full">
              <TabsList className="w-fit mb-4">
                <TabsTrigger value="raw" className="gap-2">
                  <Database className="h-4 w-4" />
                  Raw Schema
                </TabsTrigger>
                <TabsTrigger value="canonical" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Standardized Schema
                </TabsTrigger>
              </TabsList>

              <TabsContent value="raw" className="flex-1 overflow-auto border border-zinc-200 rounded-md m-0 data-[state=active]:flex flex-col bg-white">
                <Table>
                  <TableHeader className="bg-zinc-50/80 sticky top-0 z-10 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] backdrop-blur-sm">
                    <TableRow>
                      <TableHead className="w-[100px] font-semibold text-xs border-r">_sync_id</TableHead>
                      <TableHead className="w-[180px] font-semibold text-xs border-r">_synced_at</TableHead>
                      {rawHeaders.map(header => (
                        <TableHead key={header} className="font-semibold text-xs">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} className="group hover:bg-zinc-50/80">
                        <TableCell className="font-mono text-xs text-zinc-400 border-r group-hover:text-zinc-600 transition-colors">
                          {record.id.split('-')[0]}...
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500 border-r">
                          {new Date(record.createdAt).toLocaleString()}
                        </TableCell>
                        {rawHeaders.map(header => {
                          const val = record.data?.[header];
                          const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-');
                          return (
                            <TableCell key={`${record.id}-${header}`} className="text-zinc-700 max-w-[200px] truncate" title={displayVal}>
                              {displayVal}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="canonical" className="flex-1 overflow-auto border border-indigo-100 rounded-md m-0 data-[state=active]:flex flex-col bg-indigo-50/10">
                <Table>
                  <TableHeader className="bg-indigo-50/90 sticky top-0 z-10 shadow-[0_1px_2px_0_rgba(79,70,229,0.05)] backdrop-blur-sm">
                    <TableRow className="hover:bg-transparent border-indigo-100">
                      <TableHead className="w-[120px] font-semibold text-xs text-indigo-900 border-r border-indigo-100/50">_status</TableHead>
                      <TableHead className="w-[180px] font-semibold text-xs text-indigo-900 border-r border-indigo-100/50">_transformed_at</TableHead>
                      {canonicalHeaders.map(header => (
                        <TableHead key={header} className="font-semibold text-xs text-indigo-900">{header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => {
                      const cRec = record.canonicalRecord;
                      if (!cRec) {
                        return (
                          <TableRow key={record.id} className="bg-zinc-50/50 hover:bg-zinc-50/50 border-indigo-50">
                            <TableCell colSpan={canonicalHeaders.length + 2} className="text-center text-zinc-500 italic text-xs h-24">
                              Pending Transformation...
                            </TableCell>
                          </TableRow>
                        );
                      }
                      return (
                        <TableRow key={cRec.id} className="hover:bg-indigo-50/50 border-indigo-50 transition-colors">
                          <TableCell className="border-r border-indigo-50/50">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              {cRec.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-indigo-400 border-r border-indigo-50/50 font-medium">
                            {new Date(cRec.createdAt).toLocaleString()}
                          </TableCell>
                          {canonicalHeaders.map(header => {
                            const val = cRec.data?.[header];
                            const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-');
                            return (
                              <TableCell key={`${cRec.id}-${header}`} className="text-indigo-950 font-medium max-w-[200px] truncate" title={displayVal}>
                                {displayVal}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
