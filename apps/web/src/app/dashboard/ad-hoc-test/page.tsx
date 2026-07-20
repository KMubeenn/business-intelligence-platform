'use client';

import { useState } from 'react';
import { Loader2, FileSpreadsheet, Send, FileText, CheckCircle2, ChevronRight, Download, FolderSearch } from 'lucide-react';

interface FileInfo {
  name: string;
  path: string;
  sizeBytes: number;
}

export default function AdHocTestPage() {
  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [folderPath, setFolderPath] = useState('C:\\\\DevProjects\\\\business-intelligence-platform');
  const [availableFiles, setAvailableFiles] = useState<FileInfo[]>([]);
  const [selectedFilePaths, setSelectedFilePaths] = useState<Set<string>>(new Set());
  const [userQuery, setUserQuery] = useState('Generate a comprehensive executive summary based strictly on the data available in the selected files.\n\n1. Combine the data to formulate high-level business insights and KPIs.\n2. Create dedicated, deeply analyzed sections for each distinct file provided (e.g., if a "Staff Sales" file is selected, generate a "Staff Sales Analysis" section; if a "Howdy F7" file is selected, generate a "Howdy F7 Insights" section).\n3. Ensure all files are thoroughly respected, cross-referenced, and reported on accurately.');
  
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);

  const formatSize = (bytes: number) => (bytes / 1024).toFixed(1) + ' KB';

  const handleScanFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLoadingMessage('Scanning directory...');
    try {
      const res = await fetch('http://localhost:3001/reports/ad-hoc/list-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAvailableFiles(data.files);
      setSelectedFilePaths(new Set(data.files.map((f: FileInfo) => f.path))); // Auto-select all by default
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Failed to scan folder');
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (path: string) => {
    const newSet = new Set(selectedFilePaths);
    if (newSet.has(path)) newSet.delete(path);
    else newSet.add(path);
    setSelectedFilePaths(newSet);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFilePaths.size === 0) {
      setError('Please select at least one file to process.');
      return;
    }

    setLoading(true);
    setError(null);
    setStep(3);
    setLoadingMessage('AI Pipeline Running (This may take 1-3 minutes)...');

    try {
      const res = await fetch('http://localhost:3001/reports/ad-hoc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          filePaths: Array.from(selectedFilePaths), 
          userQuery 
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `Server error: ${res.status}`);
      }

      const data = await res.json();
      setPdfBase64(data.pdfBase64);
    } catch (err: any) {
      setError(err.message);
      setStep(2); // Go back on error
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = () => {
    if (!pdfBase64) return;
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = `Executive_Report_${new Date().getTime()}.pdf`;
    link.click();
  };

  return (
    <div className="w-full h-full animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <FileSpreadsheet className="w-4 h-4" />
            <span>AI Ingestion Framework</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Production Report Generator
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Select unstructured local files and use Gemini to instantly synthesize a beautifully formatted PDF executive summary.
          </p>
        </div>

        {/* Stepper UI */}
        <div className="flex items-center space-x-4 mb-8 text-sm font-medium">
          <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 1 ? 'border-primary bg-primary/10' : 'border-border bg-muted'}`}>1</div>
            <span>Directory</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 2 ? 'border-primary bg-primary/10' : 'border-border bg-muted'}`}>2</div>
            <span>Selection & Config</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${step >= 3 ? 'border-primary bg-primary/10' : 'border-border bg-muted'}`}>3</div>
            <span>Output</span>
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
          
          {/* STEP 1: FOLDER SCAN */}
          {step === 1 && (
            <div className="p-8">
              <form onSubmit={handleScanFolder} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center space-x-2">
                    <FolderSearch className="w-4 h-4 text-primary" />
                    <span>Local Data Source Directory</span>
                  </label>
                  <input 
                    type="text" 
                    value={folderPath}
                    onChange={(e) => setFolderPath(e.target.value)}
                    placeholder="e.g. C:\path\to\excel\files"
                    className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-foreground"
                    required
                  />
                  <p className="text-xs text-muted-foreground">The API will scan this server directory for compatible Excel documents.</p>
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl px-6 py-3.5 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {loadingMessage}</> : 'Scan Directory'}
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: FILE SELECTION & PROMPT */}
          {step === 2 && (
            <div className="p-8 space-y-8 animate-in slide-in-from-right-4">
              
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Discovered Files</h3>
                    <p className="text-sm text-muted-foreground">Select which files should be ingested into the AI pipeline.</p>
                  </div>
                  <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {selectedFilePaths.size} / {availableFiles.length} selected
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {availableFiles.map(file => {
                    const isSelected = selectedFilePaths.has(file.path);
                    return (
                      <div 
                        key={file.path}
                        onClick={() => toggleFile(file.path)}
                        className={`flex items-center space-x-4 p-4 rounded-xl border cursor-pointer transition-all ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-primary/50'
                        }`}
                      >
                        <div className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border ${
                          isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-input bg-background'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatSize(file.sizeBytes)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-border w-full" />

              <form onSubmit={handleGenerate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Report Generation Requirements</span>
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
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3.5 bg-muted text-foreground rounded-xl font-medium hover:bg-muted/80 transition-all"
                  >
                    Back
                  </button>
                  <button 
                    type="submit" 
                    disabled={loading || selectedFilePaths.size === 0}
                    className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-xl px-6 py-3.5 transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    Process & Generate PDF
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 3: LOADING & RESULTS */}
          {step === 3 && (
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
                    <p className="text-sm text-primary animate-pulse">Running data through multi-agent validation...</p>
                  </div>
                </>
              ) : pdfBase64 ? (
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
                      onClick={() => { setStep(1); setPdfBase64(null); }}
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
    </div>
  );
}
