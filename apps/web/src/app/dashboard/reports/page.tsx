"use client";

import { useEffect, useState } from "react";
import { getReports, createReport, deleteReport, executeReport, ReportConfig } from "@/lib/api/reports";
import { Plus, Play, Trash2, FileText, CheckCircle2, Clock, AlertCircle, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [uiError, setUiError] = useState<string | null>(null);
  const [uiSuccess, setUiSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [cron, setCron] = useState("0 19 * * *");
  const [emails, setEmails] = useState("");
  const [models, setModels] = useState("Inventory, Users, Order");

  const fetchReports = async () => {
    try {
      const data = await getReports();
      setReports(data);
      setLoading(false);
    } catch (err) {
      setUiError("Failed to fetch reports. Please ensure the backend is running.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [refreshKey]);

  useEffect(() => {
    const hasPending = reports.some(report => 
      report.executions?.some(exec => exec.status === 'PENDING')
    );
    
    if (hasPending) {
      const interval = setInterval(fetchReports, 3000);
      return () => clearInterval(interval);
    }
  }, [reports]);

  const handleCreate = async () => {
    setUiError(null);
    setUiSuccess(null);
    try {
      await createReport({
        name,
        userQuery: query,
        cronSchedule: cron,
        targetEmails: emails.split(',').map(e => e.trim()).filter(e => e),
        includedModels: models.split(',').map(e => e.trim()).filter(e => e),
      });
      setIsModalOpen(false);
      setRefreshKey(k => k + 1);
      setUiSuccess("Report scheduled successfully!");
    } catch (err: any) {
      setUiError(err.message || "Failed to create report.");
    }
  };

  const handleExecute = async (id: string) => {
    setUiError(null);
    setUiSuccess(null);
    try {
      await executeReport(id);
      setRefreshKey(k => k + 1);
      setUiSuccess("Report execution triggered! It will update automatically when finished.");
    } catch (err: any) {
      setUiError("Failed to execute report: " + (err.message || "Unknown error"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteReport(id);
      setRefreshKey(k => k + 1);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading AI Reports...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-indigo-500" />
            AI Report Automation
          </h1>
          <p className="text-muted-foreground mt-1">Schedule and generate beautiful PDF reports automatically.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus className="h-4 w-4" /> New Report
        </Button>
      </div>

      {uiError && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {uiError}
        </div>
      )}

      {uiSuccess && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {uiSuccess}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-card/30">
          <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No reports configured</h3>
          <p className="text-muted-foreground mb-6">Create your first automated AI report to get started.</p>
          <Button variant="outline" onClick={() => setIsModalOpen(true)}>Create Report</Button>
        </div>
      ) : (
        <div className="grid gap-6">
          {reports.map(report => (
            <div key={report.id} className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 shadow-sm flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    {report.name}
                    {report.isActive && <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Active</span>}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 font-mono bg-muted/50 p-2 rounded-md border border-border/50">
                    "{report.userQuery}"
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Schedule: <span className="font-mono text-foreground">{report.cronSchedule}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>To: {report.targetEmails.join(", ")}</span>
                  </div>
                </div>

                {report.executions && report.executions.length > 0 && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Executions</p>
                    <div className="space-y-2">
                      {report.executions.map(exec => (
                        <div key={exec.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg border border-border/50 bg-background/50 text-sm">
                          <div className="flex items-center gap-2">
                            {exec.status === 'SUCCESS' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> :
                             exec.status === 'PENDING' ? <Clock className="h-4 w-4 text-amber-500 animate-pulse" /> :
                             <AlertCircle className="h-4 w-4 text-destructive" />}
                            <span className="font-medium">{format(new Date(exec.executedAt), "MMM d, h:mm a")}</span>
                            <span className="text-muted-foreground text-xs">({exec.status})</span>
                          </div>
                          {exec.status === 'SUCCESS' && exec.pdfUrl && (
                            <a href={exec.pdfUrl} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 text-xs mt-2 sm:mt-0 underline underline-offset-2">
                              View Ethereal Email Preview
                            </a>
                          )}
                          {exec.status === 'FAILED' && (
                            <span className="text-destructive text-xs mt-2 sm:mt-0 max-w-xs truncate" title={exec.errorMessage || ""}>
                              {exec.errorMessage}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex md:flex-col gap-2 justify-start md:border-l md:border-border/50 md:pl-6">
                <Button variant="outline" size="sm" onClick={() => handleExecute(report.id)} className="w-full justify-start">
                  <Play className="h-4 w-4 mr-2 text-indigo-400" /> Run Now
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDelete(report.id)} className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Automated Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Report Name</Label>
              <Input placeholder="e.g. Daily Inventory Summary" value={name} onChange={(e: any) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>AI Prompt / Query</Label>
              <textarea 
                placeholder="e.g. Summarize the inventory stock across all sources. Highlight any items with stock < 10." 
                value={query} onChange={(e: any) => setQuery(e.target.value)}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-24 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cron Schedule</Label>
                <Input placeholder="0 19 * * *" value={cron} onChange={(e: any) => setCron(e.target.value)} />
                <p className="text-xs text-muted-foreground">Default: 7 PM every day</p>
              </div>
              <div className="space-y-2">
                <Label>Included Models</Label>
                <Input placeholder="Inventory, Users" value={models} onChange={(e: any) => setModels(e.target.value)} />
                <p className="text-xs text-muted-foreground">Comma separated models</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Target Emails</Label>
              <Input placeholder="boss@company.com, team@company.com" value={emails} onChange={(e: any) => setEmails(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">Create Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
