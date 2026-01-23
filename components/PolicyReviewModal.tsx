
import React, { useState, useEffect } from 'react';
import { ParsedPolicy, PolicyAnalysisReport } from '../types.ts';
import { XIcon, CheckCircleIcon, InformationCircleIcon, TrashIcon, PlusIcon, ExclamationTriangleIcon } from './icons.tsx';

interface PolicyReviewModalProps {
  report: PolicyAnalysisReport;
  onSave: (report: PolicyAnalysisReport) => void;
  onClose: () => void;
}

const DetailRow: React.FC<{ label: string, value: string | number | undefined }> = ({ label, value }) => (
    <div>
        <p className="text-xs font-medium text-medium">{label}</p>
        <p className="text-sm text-dark font-semibold">{value || 'N/A'}</p>
    </div>
);

const PolicyReviewModal: React.FC<PolicyReviewModalProps> = ({ report, onSave, onClose }) => {
  const policy = report.parsedPolicy;

  const handleSubmit = () => {
    onSave(report);
  };

  const mainCoverage = policy.coverage.find(c => c.type === 'main');
  const subLimits = policy.coverage.filter(c => c.type === 'sub-limit');

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
                        <p className="mt-1 text-xs">Please review the details extracted by the AI. If correct, confirm and save.</p>
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
            {/* Display Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                 <div className="space-y-4">
                    <h4 className="font-semibold text-dark border-b pb-1">Policy Info</h4>
                    <DetailRow label="Policy #" value={policy.policyNumber} />
                    <DetailRow label="Policyholder" value={policy.policyHolder} />
                    <DetailRow label="Provider" value={policy.provider} />
                    <DetailRow label="Policy Type" value={policy.policyType} />
                    <div className="grid grid-cols-2 gap-4">
                        <DetailRow label="Effective Date" value={policy.effectiveDate} />
                        <DetailRow label="Expiration Date" value={policy.expirationDate} />
                    </div>
                    
                    {/* Exclusions */}
                    <div className="pt-4">
                        <h4 className="font-semibold text-dark border-b pb-1 mb-2">Exclusions</h4>
                        {policy.exclusions && policy.exclusions.length > 0 ? (
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                                {policy.exclusions.map((ex, i) => <li key={i}>{ex}</li>)}
                            </ul>
                        ) : (
                            <p className="text-xs text-slate-400 italic">No exclusions extracted.</p>
                        )}
                    </div>
                </div>
                 <div className="space-y-4">
                    <h4 className="font-semibold text-dark border-b pb-1">Coverage Details</h4>
                    {mainCoverage && <DetailRow label={mainCoverage.category} value={mainCoverage.limit ? `$${mainCoverage.limit.toLocaleString()}` : 'N/A'} />}
                    <DetailRow label="Deductible" value={policy.deductible ? `$${policy.deductible.toLocaleString()}` : 'N/A'} />
                    <DetailRow label="Loss of Use (Coverage D)" value={policy.coverageD_limit ? `$${policy.coverageD_limit.toLocaleString()}` : 'N/A'} />
                    <DetailRow label="Settlement Method" value={policy.lossSettlementMethod} />
                    
                    <h4 className="font-semibold text-dark pt-2 border-b pb-1">Sub-Limits</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 -mr-2">
                        {subLimits.map((limit, index) => (
                             <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-dark">{limit.category}</span>
                                <span className="font-semibold text-dark">{limit.limit ? `$${limit.limit.toLocaleString()}` : 'N/A'}</span>
                            </div>
                        ))}
                         {subLimits.length === 0 && (
                            <p className="text-xs text-slate-500 italic text-center py-2">No sub-limits were identified by the AI.</p>
                         )}
                    </div>

                    {/* Conditions */}
                    <div className="pt-4">
                        <h4 className="font-semibold text-dark border-b pb-1 mb-2">Conditions & Duties</h4>
                        {policy.conditions && policy.conditions.length > 0 ? (
                            <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                                {policy.conditions.map((con, i) => <li key={i}>{con}</li>)}
                            </ul>
                        ) : (
                            <p className="text-xs text-slate-400 italic">No specific conditions extracted.</p>
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
