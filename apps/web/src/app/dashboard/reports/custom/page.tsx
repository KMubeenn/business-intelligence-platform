'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, FileSpreadsheet, Send, FileText, CheckCircle2, ChevronRight, Download, UploadCloud, X, LayoutTemplate, Clock } from 'lucide-react';
import api from '@/lib/api/axios';
import { getReportTemplates, ReportTemplate } from '@/lib/api/report-templates';

export default function CustomReportPage() {
  // State
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [userQuery, setUserQuery] = useState('Generate a comprehensive executive summary based strictly on the data available in the selected files.\n\n1. Combine the data to formulate high-level business insights and KPIs.\n2. Create dedicated, deeply analyzed sections for each distinct file provided (e.g., if a "Staff Sales" file is selected, generate a "Staff Sales Analysis" section; if a "Howdy F7" file is selected, generate a "Howdy F7 Insights" section).\n3. Ensure all files are thoroughly respected, cross-referenced, and reported on accurately.');
  
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  const [history, setHistory] = useState<any[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getReportTemplates().then(data => {
      setTemplates(data);
      if (data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    }).catch(console.error);

    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setIsFetchingHistory(true);
      const res = await api.get('/reports/ad-hoc');
      setHistory(res.data);
    } catch (e) {
      console.error('Failed to fetch history', e);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const loadHistoricalReport = async (id: string) => {
    try {
      setLoading(true);
      setLoadingMessage('Loading historical report...');
      const res = await api.get(`/reports/ad-hoc/${id}`);
      setPdfUrl(res.data.pdfUrl);
      setStep(2);
    } catch (e) {
      setError('Failed to load historical report');
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => (bytes / 1024 / 1024).toFixed(2) + ' MB';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(f => f.name.endsWith('.xls') || f.name.endsWith('.xlsx'));
      if (validFiles.length !== newFiles.length) {
        setError('Some files were rejected. Only .xls and .xlsx files are supported.');
      }
      setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 10)); // Max 10 files
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setError('Please upload at least one Excel file to process.');
      return;
    }

    setLoading(true);
    setError(null);
    setStep(2);
    setLoadingMessage('AI Pipeline Running (This may take 1-3 minutes)...');

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('userQuery', userQuery);
      if (selectedTemplateId) {
        formData.append('templateId', selectedTemplateId);
      }

      const res = await api.post('/reports/ad-hoc/generate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setPdfUrl(res.data.pdfUrl);
      // Prepend to history if id was returned
      if (res.data.id) {
        setHistory(prev => [{ id: res.data.id, name: `Custom Report - ${new Date().toLocaleDateString()}`, createdAt: new Date().toISOString() }, ...prev]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'An error occurred during generation.');
      setStep(1); // Go back on error
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.target = '_blank';
    link.download = `Custom_Report_${new Date().getTime()}.pdf`;
    link.click();
  };

  return (
    <div className="w-full h-full animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Main Content Column */}
        <div className="lg:col-span-3 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
              <FileSpreadsheet className="w-4 h-4" />
              <span>AI Generative Reports</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Custom Report Builder
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Upload your Excel documents and use Gemini to instantly synthesize a beautifully formatted PDF executive summary.
            </p>
          </div>

        {/* Stepper UI */}
        <div className="flex items-center space-x-4 mb-8 text-sm font-medium">
          <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 1 ? 'border-primary bg-primary/10' : 'border-border bg-muted'}`}>1</div>
            <span>Data & Configuration</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 2 ? 'border-primary bg-primary/10' : 'border-border bg-muted'}`}>2</div>
            <span>Generation Output</span>
          </div>
        </div>

        {/* Error Handling */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-6 py-4 rounded-xl flex items-center space-x-3">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl shadow-md relative overflow-hidden transition-all">
          
          {/* STEP 1: CONFIGURATION */}
          {step === 1 && (
            <div className="p-8 space-y-8">
              
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Source Files</h3>
                    <p className="text-sm text-muted-foreground">Upload up to 10 Excel files to include in this report.</p>
                  </div>
                  <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {selectedFiles.length} / 10 uploaded
                  </div>
                </div>

                <div 
                  className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center bg-muted/20 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="w-10 h-10 text-muted-foreground mb-4" />
                  <p className="text-sm font-medium text-foreground mb-1">Click to upload Excel files</p>
                  <p className="text-xs text-muted-foreground">.xls, .xlsx supported</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    multiple 
                    accept=".xls,.xlsx"
                    onChange={handleFileSelect}
                  />
                </div>
                
                {selectedFiles.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar mt-4">
                    {selectedFiles.map((file, idx) => (
                      <div 
                        key={`${file.name}-${idx}`}
                        className="flex items-center space-x-4 p-4 rounded-xl border border-border bg-background"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-px bg-border w-full" />

              <form onSubmit={handleGenerate} className="space-y-6">
                {templates.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center space-x-2">
                      <LayoutTemplate className="w-4 h-4 text-primary" />
                      <span>Report Template</span>
                    </label>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">This template will dictate the layout, colors, headers, and footers of the final PDF.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Report Generation Prompt</span>
                  </label>
                  <textarea 
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    rows={7}
                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none text-foreground"
                    required
                  />
                </div>

                <div className="flex space-x-4">
                  <button 
                    type="submit" 
                    disabled={loading || selectedFiles.length === 0}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl px-6 py-3.5 transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Process & Generate PDF
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: LOADING & RESULTS */}
          {step === 2 && (
            <div className="p-12 flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 animate-in zoom-in-95">
              {loading ? (
                <>
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-primary/20 animate-spin border-t-primary" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileSpreadsheet className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">Pipeline Active</h3>
                    <p className="text-muted-foreground">{loadingMessage}</p>
                    <p className="text-sm text-primary animate-pulse">Processing files and running AI synthesis...</p>
                  </div>
                </>
              ) : pdfUrl ? (
                <>
                  <div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-foreground">Report Ready</h3>
                    <p className="text-muted-foreground">The AI has successfully generated your print-ready PDF.</p>
                  </div>
                  <div className="flex space-x-4 pt-4">
                    <button 
                      onClick={() => { setStep(1); setPdfUrl(null); setSelectedFiles([]); }}
                      className="px-6 py-3.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-all"
                    >
                      Create Another
                    </button>
                    <button 
                      onClick={downloadPdf}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl px-8 py-3.5 transition-all flex items-center justify-center shadow-lg shadow-primary/25"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download PDF Report
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
      
      {/* History Sidebar */}
      <div className="hidden lg:block lg:col-span-1 space-y-4">
        <h3 className="font-semibold text-lg flex items-center space-x-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          <span>Report History</span>
        </h3>
        <div className="bg-card border border-border rounded-xl shadow-sm p-4 h-[calc(100vh-140px)] overflow-y-auto custom-scrollbar">
          {isFetchingHistory ? (
            <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center p-4">No historical reports found.</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div 
                  key={item.id} 
                  className="group p-3 rounded-lg border border-border/50 hover:border-primary/50 bg-background hover:bg-primary/5 transition-all cursor-pointer"
                  onClick={() => loadHistoricalReport(item.id)}
                >
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{item.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      </div>
    </div>
  );
}
