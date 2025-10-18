import React, { useState, useEffect } from 'react';
import { ParsedPolicy, PolicyAnalysisReport } from '../types.ts';
import { XIcon, CheckCircleIcon, InformationCircleIcon, TrashIcon, PlusIcon, ExclamationTriangleIcon } from './icons.tsx';
import { CurrencyInput } from './CurrencyInput.tsx';

interface PolicyReviewModalProps {
  report: PolicyAnalysisReport;
  onSave: (policy: Omit<ParsedPolicy, 'id' | 'isActive' | 'isVerified'>, report: PolicyAnalysisReport) => void;
  onClose: () => void;
}

const PolicyReviewModal: React.FC<PolicyReviewModalProps> = ({ report, onSave, onClose }) => {
  const [editablePolicy, setEditablePolicy] = useState<Omit<ParsedPolicy, 'id'| 'isActive' | 'isVerified'>>(() => ({
    policyName: `Policy ${report.parsedPolicy.policyNumber}`,
    ...report.parsedPolicy
  }));

  useEffect(() => {
    setEditablePolicy({
        policyName: `Policy ${report.parsedPolicy.provider} ${report.parsedPolicy.effectiveDate.split('-')[0]}`,
        ...report.parsedPolicy
    });
  }, [report]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditablePolicy(prev => ({ ...prev, [name]: value }));
  };

  const handleSubLimitChange = (index: number, field: 'category' | 'limit', value: string | number) => {
    const updatedCoverage = [...editablePolicy.coverage];
    const subLimits = updatedCoverage.filter(c => c.type === 'sub-limit');
    const mainCoverage = updatedCoverage.find(c => c.type === 'main');
    
    const targetLimit = subLimits[index];
    if (targetLimit) {
        (targetLimit[field] as any) = value;
    }

    const newSubLimits = [...subLimits];
    
    setEditablePolicy(prev => ({
        ...prev,
        coverage: mainCoverage ? [mainCoverage, ...newSubLimits] : newSubLimits
    }));
  };

  const handleSubmit = () => {
    onSave(editablePolicy, report);
  };

  const mainCoverage = editablePolicy.coverage.find(c => c.type === 'main');
  const subLimits = editablePolicy.coverage.filter(c => c.type === 'sub-limit');

  const getAnalysisTitle = () => {
    switch(report.analysisType) {
        case 'new': return 'AI Review: New Policy Detected';
        case 'update': return 'AI Review: Policy Update Detected';
        case 'duplicate': return 'AI Review: Duplicate Policy Detected';
    }
  }

  return (
    <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-start p-4 overflow-y-auto"
        onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-full max-w-4xl my-8 flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 md:p-5 border-b bg-slate-50">
          <h2 className="text-xl font-bold text-dark font-heading">{getAnalysisTitle()}</h2>
          <button onClick={onClose} className="text-medium rounded-full p-1 hover:text-dark hover:bg-slate-200 transition">
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto">
            <div className="p-4 mb-6 bg-blue-100 border-l-4 border-blue-500 text-blue-900">
                <div className="flex">
                    <div className="flex-shrink-0"><InformationCircleIcon className="h-5 w-5 text-blue-500" /></div>
                    <div className="ml-3">
                        <p className="text-sm font-bold">AI Confidence: {report.parsedPolicy.confidenceScore}%</p>
                        <p className="mt-1 text-xs">Please review the details extracted by the AI. You can edit any field before saving. Your corrections help the AI learn.</p>
                    </div>
                </div>
            </div>
            {report.warnings.length > 0 && (
                 <div className="p-4 mb-6 bg-amber-100 border-l-4 border-amber-500 text-amber-900">
                    <div className="flex">
                        <div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-amber-500" /></div>
                        <div className="ml-3">
                             <p className="text-sm font-bold">AI Warnings</p>
                            <ul className="mt-1 text-xs list-disc list-inside">
                                {report.warnings.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                 <div className="space-y-4">
                    <h4 className="font-semibold text-dark border-b pb-1">Policy Info</h4>
                    <div><label className="text-xs font-medium text-medium">Policy Name</label><input type="text" name="policyName" value={editablePolicy.policyName} onChange={handleChange} className="w-full mt-0.5 px-2 py-1.5 text-sm border-slate-300 rounded-md"/></div>
                    <div><label className="text-xs font-medium text-medium">Policy #</label><input type="text" name="policyNumber" value={editablePolicy.policyNumber} onChange={handleChange} className="w-full mt-0.5 px-2 py-1.5 text-sm border-slate-300 rounded-md"/></div>
                    <div><label className="text-xs font-medium text-medium">Policyholder</label><input type="text" name="policyHolder" value={editablePolicy.policyHolder} onChange={handleChange} className="w-full mt-0.5 px-2 py-1.5 text-sm border-slate-300 rounded-md"/></div>
                    <div><label className="text-xs font-medium text-medium">Provider</label><input type="text" name="provider" value={editablePolicy.provider} onChange={handleChange} className="w-full mt-0.5 px-2 py-1.5 text-sm border-slate-300 rounded-md"/></div>
                    <div><label className="text-xs font-medium text-medium">Policy Type (e.g., HO-4)</label><input type="text" name="policyType" value={editablePolicy.policyType || ''} onChange={handleChange} className="w-full mt-0.5 px-2 py-1.5 text-sm border-slate-300 rounded-md"/></div>
                    <div className="grid grid-cols-2 gap-2">
                         <div><label className="text-xs font-medium text-medium">Effective Date</label><input type="date" name="effectiveDate" value={editablePolicy.effectiveDate || ''} onChange={handleChange} className="w-full mt-0.5 px-2 py-1.5 text-sm border-slate-300 rounded-md"/></div>
                        <div><label className="text-xs font-medium text-medium">Expiration Date</label><input type="date" name="expirationDate" value={editablePolicy.expirationDate || ''} onChange={handleChange} className="w-full mt-0.5 px-2 py-1.5 text-sm border-slate-300 rounded-md"/></div>
                    </div>
                </div>
                 <div className="space-y-4">
                    <h4 className="font-semibold text-dark border-b pb-1">Coverage Details</h4>
                    {mainCoverage && <div><label className="text-xs font-medium text-medium">{mainCoverage.category}</label><CurrencyInput value={mainCoverage.limit} onChange={(v) => { /* Main limit is not typically user-editable this way */ }} className="w-full text-sm mt-0.5 px-2 py-1.5 border-slate-300 rounded-md bg-slate-50"/></div>}
                    <div><label className="text-xs font-medium text-medium">Deductible</label><CurrencyInput value={editablePolicy.deductible} onChange={(v) => setEditablePolicy(p => ({...p, deductible: v}))} className="w-full text-sm mt-0.5 px-2 py-1.5 border-slate-300 rounded-md"/></div>
                    <div><label className="text-xs font-medium text-medium">Loss of Use (Coverage D)</label><CurrencyInput value={editablePolicy.coverageD_limit} onChange={(v) => setEditablePolicy(p => ({...p, coverageD_limit: v}))} className="w-full text-sm mt-0.5 px-2 py-1.5 border-slate-300 rounded-md"/></div>
                    <div><label className="text-xs font-medium text-medium">Settlement Method</label><select name="lossSettlementMethod" value={editablePolicy.lossSettlementMethod} onChange={handleChange} className="w-full text-sm mt-0.5 px-2 py-1.5 border-slate-300 rounded-md"><option>RCV</option><option>ACV</option></select></div>
                    
                    <h4 className="font-semibold text-dark pt-2 border-b pb-1">Sub-Limits</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 -mr-2">
                        {subLimits.map((limit, index) => (
                             <div key={index} className="flex items-center gap-2">
                                <input type="text" placeholder="Category" value={limit.category} onChange={(e) => handleSubLimitChange(index, 'category', e.target.value)} className="w-full text-sm p-1 border rounded-md"/>
                                <CurrencyInput value={limit.limit} onChange={(v) => handleSubLimitChange(index, 'limit', v)} className="w-full text-sm p-1 border rounded-md"/>
                            </div>
                        ))}
                         {subLimits.length === 0 && (
                            <p className="text-xs text-slate-500 italic text-center py-2">No sub-limits were identified by the AI.</p>
                         )}
                    </div>
                </div>
            </div>
        </div>
        <div className="flex justify-end items-center p-4 bg-slate-50 border-t space-x-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">
                Cancel
            </button>
            <button onClick={handleSubmit} className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition">
                <CheckCircleIcon className="h-5 w-5" />
                <span>Confirm & Save Policy</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default PolicyReviewModal;