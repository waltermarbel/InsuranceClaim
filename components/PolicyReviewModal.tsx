
import React, { useState } from 'react';
import { ParsedPolicy, PolicyAnalysisReport, CoverageLimit } from '../types.ts';
import { XIcon, CheckCircleIcon, InformationCircleIcon, TrashIcon, PlusIcon, ExclamationTriangleIcon, BoltIcon, ShieldExclamationIcon, CurrencyDollarIcon, DocumentTextIcon, TagIcon } from './icons.tsx';

interface PolicyReviewModalProps {
  report: PolicyAnalysisReport;
  onSave: (report: PolicyAnalysisReport) => void;
  onClose: () => void;
}

// Reusable components
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }> = ({ active, onClick, icon, label, count }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${active ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
    >
        {icon}
        {label}
        {count !== undefined && <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-primary/10' : 'bg-slate-100'}`}>{count}</span>}
    </button>
);

const ArrayEditor: React.FC<{
    items: string[];
    onChange: (items: string[]) => void;
    emptyText: string;
    placeholder: string;
}> = ({ items, onChange, emptyText, placeholder }) => {
    const updateItem = (index: number, val: string) => {
        const newItems = [...items];
        newItems[index] = val;
        onChange(newItems);
    };
    const deleteItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        onChange(newItems);
    };
    const addItem = () => onChange([...items, '']);

    return (
        <div className="space-y-3">
            {items.length === 0 && <p className="text-sm text-slate-400 italic py-4 text-center border-2 border-dashed border-slate-100 rounded-lg">{emptyText}</p>}
            {items.map((item, i) => (
                <div key={i} className="flex gap-2 group">
                    <textarea 
                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-shadow resize-none"
                        rows={2}
                        value={item}
                        onChange={(e) => updateItem(i, e.target.value)}
                        placeholder={placeholder}
                    />
                    <button onClick={() => deleteItem(i)} className="self-start mt-2 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                        <TrashIcon className="h-4 w-4"/>
                    </button>
                </div>
            ))}
            <button onClick={addItem} className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary-dark transition-colors px-1">
                <PlusIcon className="h-4 w-4"/> Add Entry
            </button>
        </div>
    );
};

const PolicyReviewModal: React.FC<PolicyReviewModalProps> = ({ report, onSave, onClose }) => {
  const [editedPolicy, setEditedPolicy] = useState<ParsedPolicy>(report.parsedPolicy as ParsedPolicy);
  const [warnings, setWarnings] = useState<string[]>(report.warnings || []);
  const [activeTab, setActiveTab] = useState<'info' | 'triggers' | 'limits' | 'exclusions' | 'conditions'>('info');

  const handleSubmit = () => {
    onSave({ ...report, parsedPolicy: editedPolicy, warnings: warnings });
  };

  const updateField = (field: keyof ParsedPolicy, value: any) => {
      setEditedPolicy(prev => ({ ...prev, [field]: value }));
  };

  const updateCoverage = (index: number, field: keyof CoverageLimit, value: any) => {
      const newCoverage = [...(editedPolicy.coverage || [])];
      newCoverage[index] = { ...newCoverage[index], [field]: value };
      setEditedPolicy(prev => ({ ...prev, coverage: newCoverage }));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-white">
          <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">Review Policy Details</h2>
              <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">AI Confidence: {editedPolicy.confidenceScore}%</span>
                  {warnings.length > 0 && <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">{warnings.length} Warnings</span>}
              </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition"><XIcon className="h-6 w-6" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-slate-50/50 px-6 overflow-x-auto">
            <TabButton 
                active={activeTab === 'info'} 
                onClick={() => setActiveTab('info')} 
                icon={<InformationCircleIcon className="h-4 w-4"/>} 
                label="General & Limits" 
            />
            <TabButton 
                active={activeTab === 'triggers'} 
                onClick={() => setActiveTab('triggers')} 
                icon={<BoltIcon className="h-4 w-4"/>} 
                label="Triggers" 
                count={(editedPolicy.triggers || []).length}
            />
            <TabButton 
                active={activeTab === 'limits'} 
                onClick={() => setActiveTab('limits')} 
                icon={<TagIcon className="h-4 w-4"/>} 
                label="Special Limits" 
                count={(editedPolicy.limits || []).length}
            />
            <TabButton 
                active={activeTab === 'exclusions'} 
                onClick={() => setActiveTab('exclusions')} 
                icon={<ShieldExclamationIcon className="h-4 w-4"/>} 
                label="Exclusions" 
                count={(editedPolicy.exclusions || []).length}
            />
            <TabButton 
                active={activeTab === 'conditions'} 
                onClick={() => setActiveTab('conditions')} 
                icon={<ExclamationTriangleIcon className="h-4 w-4"/>} 
                label="Conditions" 
                count={(editedPolicy.conditions || []).length}
            />
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-8 bg-slate-50/30">
            {activeTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Policy Information</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Provider</label>
                                <input type="text" value={editedPolicy.provider || ''} onChange={e => updateField('provider', e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Policy Number</label>
                                <input type="text" value={editedPolicy.policyNumber || ''} onChange={e => updateField('policyNumber', e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Deductible</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                        <input type="number" value={editedPolicy.deductible || 0} onChange={e => updateField('deductible', parseFloat(e.target.value))} className="w-full p-2.5 pl-6 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Loss of Use Limit</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-slate-400">$</span>
                                        <input type="number" value={editedPolicy.coverageD_limit || 0} onChange={e => updateField('coverageD_limit', parseFloat(e.target.value))} className="w-full p-2.5 pl-6 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Policyholder(s)</label>
                                <input type="text" value={editedPolicy.policyHolder || ''} onChange={e => updateField('policyHolder', e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><CurrencyDollarIcon className="h-4 w-4"/> Coverage Limits</h3>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold text-slate-600">Category</th>
                                        <th className="px-4 py-3 font-semibold text-slate-600 text-right">Limit ($)</th>
                                        <th className="px-4 py-3 font-semibold text-slate-600 text-center">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(editedPolicy.coverage || []).map((cov, i) => (
                                        <tr key={i} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2">
                                                <input type="text" value={cov.category} onChange={e => updateCoverage(i, 'category', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-0 font-medium text-slate-700" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" value={cov.limit} onChange={e => updateCoverage(i, 'limit', parseFloat(e.target.value))} className="w-full bg-transparent border-none focus:ring-0 p-0 text-right font-mono text-slate-700" />
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${cov.type === 'main' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{cov.type}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-start gap-3">
                            <InformationCircleIcon className="h-5 w-5 flex-shrink-0 mt-0.5"/>
                            <p>Verify that <strong>Personal Property</strong> is correctly identified as a 'Main' coverage limit, as this determines your total payout cap.</p>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'triggers' && (
                <div className="max-w-3xl mx-auto">
                    <div className="mb-6 flex items-center gap-3 bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-indigo-900">
                        <BoltIcon className="h-6 w-6"/>
                        <div>
                            <h4 className="font-bold">Covered Perils (Triggers)</h4>
                            <p className="text-sm opacity-80">These are the specific events that your policy covers (e.g., Fire, Theft, Vandalism).</p>
                        </div>
                    </div>
                    <ArrayEditor 
                        items={editedPolicy.triggers || []} 
                        onChange={(items) => updateField('triggers', items)}
                        emptyText="No triggers detected. Check the 'Perils Insured Against' section of your policy."
                        placeholder="e.g. Fire or Lightning"
                    />
                </div>
            )}

            {activeTab === 'limits' && (
                <div className="max-w-3xl mx-auto">
                    <div className="mb-6 flex items-center gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-800">
                        <TagIcon className="h-6 w-6"/>
                        <div>
                            <h4 className="font-bold">Special Limits Clauses</h4>
                            <p className="text-sm opacity-80">Specific sub-limits described in text (e.g. '$200 for money'). Used for fine-tuning coverage.</p>
                        </div>
                    </div>
                    <ArrayEditor 
                        items={editedPolicy.limits || []} 
                        onChange={(items) => updateField('limits', items)}
                        emptyText="No special textual limits detected."
                        placeholder="e.g. $1,500 limit for jewelry theft"
                    />
                </div>
            )}

            {activeTab === 'exclusions' && (
                <div className="max-w-3xl mx-auto">
                    <div className="mb-6 flex items-center gap-3 bg-rose-50 p-4 rounded-lg border border-rose-100 text-rose-900">
                        <ShieldExclamationIcon className="h-6 w-6"/>
                        <div>
                            <h4 className="font-bold">Policy Exclusions</h4>
                            <p className="text-sm opacity-80">Events or items specifically NOT covered. Critical for gap analysis.</p>
                        </div>
                    </div>
                    <ArrayEditor 
                        items={editedPolicy.exclusions || []} 
                        onChange={(items) => updateField('exclusions', items)}
                        emptyText="No exclusions detected. This is unusual - verify your policy document."
                        placeholder="e.g. Flood damage caused by external water..."
                    />
                </div>
            )}

            {activeTab === 'conditions' && (
                <div className="max-w-3xl mx-auto">
                    <div className="mb-6 flex items-center gap-3 bg-amber-50 p-4 rounded-lg border border-amber-100 text-amber-900">
                        <ExclamationTriangleIcon className="h-6 w-6"/>
                        <div>
                            <h4 className="font-bold">Conditions & Duties</h4>
                            <p className="text-sm opacity-80">Requirements you must meet to file a valid claim (e.g., filing deadlines).</p>
                        </div>
                    </div>
                    <ArrayEditor 
                        items={editedPolicy.conditions || []} 
                        onChange={(items) => updateField('conditions', items)}
                        emptyText="No conditions detected."
                        placeholder="e.g. You must notify the police in case of theft..."
                    />
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t bg-white">
            <div className="text-xs text-slate-500">
                <p>Last Analysis: {new Date().toLocaleDateString()}</p>
            </div>
            <div className="flex gap-3">
                <button onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition">Cancel</button>
                <button onClick={handleSubmit} className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold bg-primary text-white rounded-lg shadow-md hover:bg-primary-dark transition transform active:scale-95">
                    <CheckCircleIcon className="h-5 w-5"/>
                    Confirm & Save Policy
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PolicyReviewModal;
    