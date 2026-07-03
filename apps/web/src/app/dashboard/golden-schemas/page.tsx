"use client";

import { useEffect, useState } from "react";
import { Plus, Database, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRole } from "@/hooks/useRole";
import { getCanonicalModels, createCanonicalModel, updateCanonicalModel, deleteCanonicalModel, CanonicalModel } from "@/lib/api/canonical-models";

export default function GoldenSchemasPage() {
  const [models, setModels] = useState<CanonicalModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { isOwnerOrAdmin } = useRole();
  const canManage = isOwnerOrAdmin;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [schemaFields, setSchemaFields] = useState<{name: string; type: string}[]>([]);

  const loadModels = async () => {
    try {
      setLoading(true);
      const data = await getCanonicalModels();
      setModels(data);
    } catch (err: any) {
      setError(err.message || "Failed to load Golden Schemas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setSchemaFields([{ name: "id", type: "string" }]);
    setDialogOpen(true);
  };

  const handleOpenEdit = (model: CanonicalModel) => {
    setEditingId(model.id);
    setName(model.name);
    
    // schemaJson is expected to be an array of objects: [{name: 'field', type: 'string'}]
    let fieldsArray: {name: string; type: string}[] = [];
    
    if (Array.isArray(model.schemaJson)) {
      fieldsArray = model.schemaJson.map((f: any) => ({
        name: f.name || '',
        type: f.type || 'string'
      }));
    } else if (model.schemaJson && typeof model.schemaJson === 'object') {
      // Fallback for incorrectly saved dictionary formats
      fieldsArray = Object.entries(model.schemaJson).map(([k, v]) => ({
        name: k,
        type: typeof v === 'object' && v !== null && (v as any).type ? (v as any).type : String(v)
      }));
    }

    setSchemaFields(fieldsArray.length > 0 ? fieldsArray : [{ name: "id", type: "string" }]);
    setDialogOpen(true);
  };

  const handleAddField = () => {
    setSchemaFields([...schemaFields, { name: "", type: "string" }]);
  };

  const handleRemoveField = (index: number) => {
    setSchemaFields(schemaFields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: 'name' | 'type', value: string) => {
    const updated = [...schemaFields];
    updated[index][key] = value;
    setSchemaFields(updated);
  };

  const handleSave = async () => {
    if (!name) {
      alert("Name is required");
      return;
    }

    // Filter out empty names and save as array
    const schemaJson = schemaFields
      .filter(f => f.name.trim() !== '')
      .map(f => ({ name: f.name.trim(), type: f.type }));

    try {
      if (editingId) {
        await updateCanonicalModel(editingId, { name, schemaJson });
      } else {
        await createCanonicalModel({ name, schemaJson });
      }
      setDialogOpen(false);
      loadModels();
    } catch (err: any) {
      alert(err.message || "Failed to save schema");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Golden Schema? This may break existing field mappings.")) return;
    try {
      await deleteCanonicalModel(id);
      loadModels();
    } catch (err: any) {
      alert(err.message || "Failed to delete schema");
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full pt-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Golden Schemas</h1>
          <p className="text-muted-foreground mt-1">Manage Canonical Models to standardize data across all your sources.</p>
        </div>
        {canManage && (
          <Button onClick={handleOpenCreate} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">
            <Plus className="h-4 w-4" />
            New Schema
          </Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-muted-foreground text-sm font-medium">Loading schemas...</div>
        ) : error ? (
          <div className="py-12 text-center text-destructive text-sm font-medium">{error}</div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 border border-border">
              <Database className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No Golden Schemas found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm">
              Create a Canonical Model to standardize data structures for reporting.
            </p>
            {canManage && (
              <Button onClick={handleOpenCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">Create Golden Schema</Button>
            )}
          </div>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-4 border-b border-border bg-muted/50 p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <div className="col-span-2">Name</div>
              <div>Fields Count</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-border">
              {models.map((model) => {
                const fieldCount = Object.keys(model.schemaJson || {}).length;
                return (
                  <div key={model.id} className="grid grid-cols-4 items-center p-4 text-sm hover:bg-muted/50 transition-colors">
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted border border-border flex items-center justify-center">
                        <Database className="h-4 w-4 text-primary" />
                      </div>
                      <div className="font-semibold text-foreground">{model.name}</div>
                    </div>
                    <div className="text-muted-foreground">{fieldCount} Fields</div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(model)} className="h-8 text-muted-foreground hover:text-foreground">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(model.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Golden Schema' : 'New Golden Schema'}</DialogTitle>
            <DialogDescription>
              Define the standard structure for this canonical model.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Schema Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sales Customer" />
            </div>
            
            <div className="grid gap-2 mt-4">
              <div className="flex justify-between items-center">
                <Label>Schema Fields</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddField}>+ Add Field</Button>
              </div>
              
              {schemaFields.map((field, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input 
                    placeholder="Field name (e.g. firstName)" 
                    value={field.name} 
                    onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <select
                    className="flex h-10 w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={field.type}
                    onChange={(e) => handleFieldChange(index, 'type', e.target.value)}
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="date">Date</option>
                  </select>
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveField(index)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Schema</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
