'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import { getReportTemplates, createReportTemplate, updateReportTemplate, deleteReportTemplate, ReportTemplate, LayoutConfig } from '@/lib/api/report-templates';
import { Plus, Trash2, Edit2, LayoutTemplate, Save, X, Settings2 } from 'lucide-react';

const DEFAULT_LAYOUT: LayoutConfig = {
  primaryColor: '#3b82f6',
  header: {
    logoUrl: '',
    logoPosition: 'left',
    titleText: 'Report',
    titlePosition: 'right',
    showDate: true
  },
  footer: {
    disclaimerText: 'Confidential - Internal Use Only',
    disclaimerPosition: 'left',
    signatureText: 'Generated automatically',
    signaturePosition: 'right',
    showPageNumbers: false
  }
};

export default function TemplatesPage() {
  const { isOwnerOrAdmin } = useRole();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [layout, setLayout] = useState<LayoutConfig>(DEFAULT_LAYOUT);

  useEffect(() => {
    if (isOwnerOrAdmin) {
      fetchTemplates();
    } else {
      setLoading(false);
    }
  }, [isOwnerOrAdmin]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await getReportTemplates();
      setTemplates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    setIsNew(true);
    setEditingTemplate(null);
    setName('');
    setIsDefault(templates.length === 0); // first template is default
    setLayout(DEFAULT_LAYOUT);
  };

  const handleEdit = (template: ReportTemplate) => {
    setIsNew(false);
    setEditingTemplate(template);
    setName(template.name);
    setIsDefault(template.isDefault);
    setLayout(template.layoutConfig);
  };

  const handleSave = async () => {
    try {
      if (isNew) {
        await createReportTemplate({ name, isDefault, layoutConfig: layout });
      } else if (editingTemplate) {
        await updateReportTemplate(editingTemplate.id, { name, isDefault, layoutConfig: layout });
      }
      setEditingTemplate(null);
      setIsNew(false);
      fetchTemplates();
    } catch (e) {
      console.error(e);
      alert('Failed to save template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteReportTemplate(id);
      fetchTemplates();
    } catch (e) {
      console.error(e);
      alert('Failed to delete template. It might be in use.');
    }
  };

  if (!isOwnerOrAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-white mb-2">Report Templates</h1>
        <p className="text-gray-400">You must be an Owner or Admin to manage templates.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Report Templates</h1>
          <p className="text-gray-400">Create beautiful, standardized PDF layouts for your automated reports.</p>
        </div>
        {!editingTemplate && !isNew && (
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" /> New Template
          </button>
        )}
      </div>

      {(editingTemplate || isNew) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Builder Sidebar */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-xl space-y-6">
            <div className="flex justify-between items-center border-b border-gray-700 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-500" />
                Template Settings
              </h2>
              <button onClick={() => { setEditingTemplate(null); setIsNew(false); }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Template Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Executive Summary"
                />
              </div>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm">Set as Default Template</span>
              </label>

              <hr className="border-gray-700" />

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Primary Brand Color</label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={layout.primaryColor}
                    onChange={(e) => setLayout({...layout, primaryColor: e.target.value})}
                    className="w-12 h-10 rounded cursor-pointer bg-gray-900 border border-gray-700"
                  />
                  <input
                    type="text"
                    value={layout.primaryColor}
                    onChange={(e) => setLayout({...layout, primaryColor: e.target.value})}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Header Configuration */}
              <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 space-y-4">
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Header Configuration</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Logo URL</label>
                  <input
                    type="url"
                    value={layout.header.logoUrl}
                    onChange={(e) => setLayout({...layout, header: {...layout.header, logoUrl: e.target.value}})}
                    className="w-full bg-gray-800 border border-gray-600 rounded py-1 px-3 text-white focus:outline-none focus:border-indigo-500 text-sm mb-2"
                  />
                  <select 
                    value={layout.header.logoPosition}
                    onChange={(e) => setLayout({...layout, header: {...layout.header, logoPosition: e.target.value as any}})}
                    className="w-full bg-gray-800 border border-gray-600 rounded py-1 px-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="left">Logo Position: Left</option>
                    <option value="center">Logo Position: Center</option>
                    <option value="right">Logo Position: Right</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Title Text</label>
                  <input
                    type="text"
                    value={layout.header.titleText}
                    onChange={(e) => setLayout({...layout, header: {...layout.header, titleText: e.target.value}})}
                    className="w-full bg-gray-800 border border-gray-600 rounded py-1 px-3 text-white focus:outline-none focus:border-indigo-500 text-sm mb-2"
                  />
                  <select 
                    value={layout.header.titlePosition}
                    onChange={(e) => setLayout({...layout, header: {...layout.header, titlePosition: e.target.value as any}})}
                    className="w-full bg-gray-800 border border-gray-600 rounded py-1 px-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="left">Title Position: Left</option>
                    <option value="center">Title Position: Center</option>
                    <option value="right">Title Position: Right</option>
                  </select>
                </div>
                
                <label className="flex items-center gap-2 text-gray-300">
                  <input
                    type="checkbox"
                    checked={layout.header.showDate}
                    onChange={(e) => setLayout({...layout, header: {...layout.header, showDate: e.target.checked}})}
                    className="rounded border-gray-600 bg-gray-800 text-indigo-600"
                  />
                  <span className="text-xs">Show Generation Date</span>
                </label>
              </div>

              {/* Footer Configuration */}
              <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 space-y-4">
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">Footer Configuration</h3>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Signature Block</label>
                  <input
                    type="text"
                    value={layout.footer.signatureText}
                    onChange={(e) => setLayout({...layout, footer: {...layout.footer, signatureText: e.target.value}})}
                    className="w-full bg-gray-800 border border-gray-600 rounded py-1 px-3 text-white focus:outline-none focus:border-indigo-500 text-sm mb-2"
                  />
                  <select 
                    value={layout.footer.signaturePosition}
                    onChange={(e) => setLayout({...layout, footer: {...layout.footer, signaturePosition: e.target.value as any}})}
                    className="w-full bg-gray-800 border border-gray-600 rounded py-1 px-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="left">Signature Position: Left</option>
                    <option value="center">Signature Position: Center</option>
                    <option value="right">Signature Position: Right</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Disclaimer Text</label>
                  <input
                    type="text"
                    value={layout.footer.disclaimerText}
                    onChange={(e) => setLayout({...layout, footer: {...layout.footer, disclaimerText: e.target.value}})}
                    className="w-full bg-gray-800 border border-gray-600 rounded py-1 px-3 text-white focus:outline-none focus:border-indigo-500 text-sm mb-2"
                  />
                  <select 
                    value={layout.footer.disclaimerPosition}
                    onChange={(e) => setLayout({...layout, footer: {...layout.footer, disclaimerPosition: e.target.value as any}})}
                    className="w-full bg-gray-800 border border-gray-600 rounded py-1 px-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value="left">Disclaimer Position: Left</option>
                    <option value="center">Disclaimer Position: Center</option>
                    <option value="right">Disclaimer Position: Right</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="flex items-center justify-center w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors gap-2"
            >
              <Save className="w-5 h-5" /> Save Template
            </button>
          </div>

          {/* Live Preview Canvas */}
          <div className="flex flex-col">
            <div className="block text-sm font-medium text-gray-300 mb-2">Live Canvas Preview</div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full min-h-[600px] flex flex-col relative overflow-hidden" style={{ color: '#111' }}>
              
              {/* Preview Header */}
              <div 
                className="p-8 border-b-4 mb-4 flex items-center relative" 
                style={{ borderColor: layout.primaryColor, minHeight: '120px' }}
              >
                {/* Logo */}
                <div style={{ position: 'absolute', [layout.header.logoPosition === 'center' ? 'left' : layout.header.logoPosition]: layout.header.logoPosition === 'center' ? '50%' : '2rem', transform: layout.header.logoPosition === 'center' ? 'translateX(-50%)' : 'none' }}>
                  {layout.header.logoUrl ? (
                    <img src={layout.header.logoUrl} alt="Logo" className="h-10 object-contain max-w-[200px]" />
                  ) : (
                    <div className="h-10 w-32 bg-gray-200 rounded flex items-center justify-center text-sm font-bold text-gray-400">LOGO</div>
                  )}
                </div>

                {/* Title */}
                <div style={{ position: 'absolute', [layout.header.titlePosition === 'center' ? 'left' : layout.header.titlePosition]: layout.header.titlePosition === 'center' ? '50%' : '2rem', transform: layout.header.titlePosition === 'center' ? 'translateX(-50%)' : 'none', color: layout.primaryColor }}>
                  <h1 className="text-2xl font-bold m-0 leading-tight">{layout.header.titleText || 'Report Title'}</h1>
                  {layout.header.showDate && <div className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString()}</div>}
                </div>
              </div>

              {/* Preview Body */}
              <div className="p-8 space-y-4 flex-1 opacity-50">
                <div className="h-6 w-1/3 rounded" style={{ backgroundColor: layout.primaryColor }}></div>
                <div className="h-4 w-full bg-gray-200 rounded"></div>
                <div className="h-4 w-full bg-gray-200 rounded"></div>
                <div className="h-4 w-5/6 bg-gray-200 rounded"></div>
                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="h-24 bg-gray-100 rounded border border-gray-200"></div>
                  <div className="h-24 bg-gray-100 rounded border border-gray-200"></div>
                  <div className="h-24 bg-gray-100 rounded border border-gray-200"></div>
                </div>
                <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-300 mt-8 rounded-lg">
                  <span className="text-gray-400 font-medium">AI Generated Report Content Placed Here</span>
                </div>
              </div>

              {/* Preview Footer */}
              <div className="mt-auto p-8 border-t border-gray-100 relative" style={{ minHeight: '100px' }}>
                {/* Signature */}
                <div style={{ position: 'absolute', [layout.footer.signaturePosition === 'center' ? 'left' : layout.footer.signaturePosition]: layout.footer.signaturePosition === 'center' ? '50%' : '2rem', transform: layout.footer.signaturePosition === 'center' ? 'translateX(-50%)' : 'none', bottom: '2rem' }}>
                  <div className="text-sm italic text-gray-800 border-t border-gray-800 pt-2 min-w-[150px] text-center">
                    {layout.footer.signatureText || 'Signature'}
                  </div>
                </div>

                {/* Disclaimer */}
                <div style={{ position: 'absolute', [layout.footer.disclaimerPosition === 'center' ? 'left' : layout.footer.disclaimerPosition]: layout.footer.disclaimerPosition === 'center' ? '50%' : '2rem', transform: layout.footer.disclaimerPosition === 'center' ? 'translateX(-50%)' : 'none', bottom: '2rem' }}>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider max-w-[200px]">
                    {layout.footer.disclaimerText || 'Confidential'}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="text-gray-400">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 bg-gray-800/30 border border-gray-700 border-dashed rounded-xl">
              <LayoutTemplate className="w-12 h-12 text-gray-500 mb-4" />
              <p className="text-gray-400 text-lg mb-4">No templates found.</p>
              <button 
                onClick={handleAddNew}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Create First Template
              </button>
            </div>
          ) : (
            templates.map(template => (
              <div key={template.id} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 p-6 rounded-xl hover:border-gray-600 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <LayoutTemplate className="w-5 h-5 text-indigo-500" />
                      {template.name}
                    </h3>
                    {template.isDefault && (
                      <span className="inline-block mt-2 px-2 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-full border border-indigo-500/30">
                        Default Template
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEdit(template)}
                      className="p-2 text-gray-400 hover:text-white bg-gray-900 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-red-400 hover:text-white hover:bg-red-900/50 bg-gray-900 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2 mt-4 text-sm text-gray-400">
                  <p>Color: <span className="inline-block w-3 h-3 rounded-full mr-2 align-middle" style={{ backgroundColor: template.layoutConfig.primaryColor }}></span>{template.layoutConfig.primaryColor}</p>
                  <p>Logo: {template.layoutConfig.header.logoUrl ? 'Configured' : 'None'}</p>
                  <p>Title: {template.layoutConfig.header.titleText}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
