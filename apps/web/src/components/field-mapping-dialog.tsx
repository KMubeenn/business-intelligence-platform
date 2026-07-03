"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getCanonicalModels, getFieldMapping, updateFieldMapping } from "@/lib/api/data-sources";
import { Loader2, ArrowRightLeft, Save, Sparkles } from "lucide-react";

interface FieldMappingDialogProps {
  dataSourceId: string;
  tableName: string;
  columns: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FieldMappingDialog({
  dataSourceId,
  tableName,
  columns,
  open,
  onOpenChange,
}: FieldMappingDialogProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  const [models, setModels] = useState<any[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [mappings, setMappings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    
    let isMounted = true;
    setLoading(true);
    setError("");

    Promise.all([
      getCanonicalModels(),
      getFieldMapping(dataSourceId, tableName)
    ]).then(([modelsData, mappingData]) => {
      if (isMounted) {
        setModels(modelsData);
        if (mappingData.canonicalModelId) {
          setSelectedModelId(mappingData.canonicalModelId);
          setMappings(mappingData.mappingRules || {});
        } else if (modelsData.length > 0) {
          // Default to first model
          setSelectedModelId(modelsData[0].id);
        }
        setLoading(false);
      }
    }).catch(err => {
      if (isMounted) {
        setError("Failed to load mapping data.");
        setLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, [dataSourceId, tableName, open]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateFieldMapping(dataSourceId, tableName, selectedModelId, mappings);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save mapping");
    } finally {
      setSaving(false);
    }
  };

  const selectedModel = models.find(m => m.id === selectedModelId);
  const expectedFields = selectedModel?.schemaJson || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Map Fields: <span className="font-mono bg-muted px-2 py-0.5 rounded text-sm text-foreground">{tableName}</span>
          </DialogTitle>
          <DialogDescription className="space-y-2">
            <p>Map your raw database columns to the standard Canonical Schema.</p>
            <p className="text-xs bg-primary/10 text-primary p-2 rounded-md border border-primary/20">
              <strong>Tip for Excel Files:</strong> By mapping inconsistently named spreadsheet columns (e.g. &quot;CustID&quot;, &quot;Client Number&quot;) to a unified Golden Schema, the platform automatically standardizes your data for reporting.
            </p>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>Loading schema definitions...</p>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-destructive border border-border bg-destructive/10 rounded-md">
            {error}
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Target Canonical Model</label>
              <Select value={selectedModelId} onValueChange={(val) => setSelectedModelId(val || "")}>
                <SelectTrigger className="w-full h-12 bg-background">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <SelectValue placeholder="Select a model" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedModel && (
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div>Canonical Field ({selectedModel.name})</div>
                  <div>Raw Column ({tableName})</div>
                </div>
                <div className="divide-y divide-border">
                  {expectedFields.map((field: any) => (
                    <div key={field.name} className="grid grid-cols-2 gap-4 p-4 items-center hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground flex items-center gap-2">
                          {field.name}
                          {field.required && <span className="text-[10px] text-destructive font-bold">*</span>}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono mt-1 opacity-70">type: {field.type || 'any'}</span>
                      </div>
                      
                      <Select 
                        value={mappings[field.name] || ""} 
                        onValueChange={(val) => setMappings(prev => ({ ...prev, [field.name]: val || "" }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="-- Ignore --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=" ">-- Ignore --</SelectItem>
                          {columns.map(col => (
                            <SelectItem key={col.Field || col.name || col} value={col.Field || col.name || col}>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">{col.Field || col.name || col}</span>
                                {col.Type && <span className="text-[10px] text-muted-foreground">({col.Type})</span>}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-6 border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading || saving} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
