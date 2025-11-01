import React, { useRef, useState } from 'react';
// Fix: Added .ts extension to file path
import { ParsedPolicy } from '../types.ts';
import { ShieldCheckIcon, SpinnerIcon, DocumentTextIcon, PencilIcon, CheckCircleIcon, PlusIcon, TrashIcon, ExclamationTriangleIcon } from './icons';
import { CurrencyInput } from './CurrencyInput';

interface InsuranceSectionProps {
  policies: ParsedPolicy[];
  onUpload: (file: File) => void;
  onSetActivePolicy: (policyId: string) => void;
  isLoading: boolean;
}

const PolicyDetails: React.FC<{ policy: ParsedPolicy }> = ({ policy }) => {
    const mainCoverage = policy.coverage.find(c => c.type === 'main');
    const subLimits = policy.coverage.filter(c => c.type === 'sub-limit');

    return (
        <div className="p-4 bg-slate-50/70 rounded-b-lg">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div className="space-y-3">
                    <h4 className="font-semibold text-dark border-b pb-1">Policy Info</h4>
                    <div><p className="text-xs text-medium">Policy #</p><p className="font-semibold text-dark">{policy.policyNumber}</p></div>
                    <div><p className="text-xs text-medium">Policyholder</p><p className="font-semibold text-dark truncate">{policy.policyHolder}</p></div>
                    <div><p className="text-xs text-medium">Provider</p><p className="font-semibold text-dark">{policy.provider}</p></div>
                    <div><p className="text-xs text-medium">Policy Type</p><p className="font-semibold text-dark">{policy.policyType || 'N/A'}</p></div>
                     <div className="grid grid-cols-2 gap-2">
                        <div><p className="text-xs text-medium">Effective Date</p><p className="font-semibold text-dark">{policy.effectiveDate || ''}</p></div>
                        <div><p className="text-xs text-medium">Expiration Date</p><p className="font-semibold text-dark">{policy.expirationDate || ''}</p></div>
                    </div>
                </div>
                <div className="space-y-3">
                    <h4 className="font-semibold text-dark border-b pb-1">Coverage Details</h4>
                    {mainCoverage && <div><p className="text-xs text-medium">{mainCoverage.category}</p><p className="font-bold text-lg text-dark">${mainCoverage.limit.toLocaleString()}</p></div>}
                    <div><p className="text-xs text-medium">Deductible</p><p className="font-semibold text-dark">${policy.deductible.toLocaleString()}</p></div>
                    <div><p className="text-xs text-medium">Loss of Use (Coverage D)</p><p className="font-semibold text-dark">${policy.coverageD_limit.toLocaleString()}</p></div>
                    <div><p className="text-xs text-medium">Settlement Method</p><p className="font-semibold text-dark">{policy.lossSettlementMethod}</p></div>
                    
                    <h4 className="font-semibold text-dark pt-2 border-b pb-1">Sub-Limits</h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 -mr-2">
                        {subLimits.map((limit, index) => (
                             <div key={index} className="flex items-center justify-between">
                                <p className="font-medium text-dark">{limit.category}</p>
                                <p className="font-semibold text-dark">${limit.limit.toLocaleString()}</p>
                            </div>
                        ))}
                         {subLimits.length === 0 && (
                            <p className="text-xs text-slate-500 italic text-center py-2">No sub-limits identified.</p>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};


const UploadZone: React.FC<{ onUpload: (file: File) => void, isLoading: boolean }> = ({ onUpload, isLoading }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
          onUpload(event.target.files[0]);
        }
    };
    
    const handleClick = () => {
        if (!isLoading) fileInputRef.current?.click();
    };

    return (
         <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors border-slate-300 ${isLoading ? 'cursor-default bg-slate-100' : 'cursor-pointer hover:border-primary/70'}`}
            onClick={handleClick}
        >
             <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" disabled={isLoading}/>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center space-y-3 text-medium">
                    <SpinnerIcon className="h-10 w-10 text-primary"/>
                    <span className="font-semibold">Analyzing Policy with Gemini...</span>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-3 text-medium">
                    <DocumentTextIcon className="h-10 w-10 text-slate-400"/>
                    <p className="font-semibold">
                        Drag & drop a policy PDF or <span className="text-primary">browse</span>
                    </p>
                </div>
            )}
        </div>
    );
};

export const InsuranceSection: React.FC<InsuranceSectionProps> = ({ policies, onUpload, onSetActivePolicy, isLoading }) => {
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(policies.find(p => p.isActive)?.id || null);

  const toggleExpand = (policyId: string) => {
    setExpandedPolicyId(prev => prev === policyId ? null : policyId);
  }

  return (
    <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold tracking-tight text-dark font-heading flex items-center gap-2">
                <ShieldCheckIcon className="h-6 w-6 text-medium"/>
                Insurance Policies
            </h3>
            {policies.length > 0 && (
                <button onClick={() => { (document.querySelector('#policy-upload-button input') as HTMLInputElement)?.click() }} disabled={isLoading} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline disabled:opacity-50">
                    <PlusIcon className="h-4 w-4"/> Add Policy
                </button>
            )}
        </div>

        {policies.length === 0 ? (
            <UploadZone onUpload={onUpload} isLoading={isLoading} />
        ) : (
             <div className="space-y-3">
                {policies.map(policy => (
                    <div key={policy.id} className="bg-white rounded-lg shadow-sm border border-slate-200">
                        <div className="p-4 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button onClick={() => onSetActivePolicy(policy.id)} className="flex items-center gap-2 cursor-pointer">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${policy.isActive ? 'border-primary bg-primary' : 'border-slate-300 bg-white'}`}>
                                        {policy.isActive && <CheckCircleIcon className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className={`font-semibold ${policy.isActive ? 'text-primary' : 'text-dark'}`}>{policy.policyName || `Policy #${policy.policyNumber}`}</span>
                                </button>
                                {policy.isVerified ? (
                                    <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full flex items-center gap-1" title="Verified by user">
                                        <CheckCircleIcon className="h-3 w-3" /> Verified
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <ExclamationTriangleIcon className="h-3 w-3" /> Review Needed
                                    </span>
                                )}
                            </div>
                            <button onClick={() => toggleExpand(policy.id)} className="text-sm font-semibold text-medium hover:text-dark">
                                {expandedPolicyId === policy.id ? 'Hide Details' : 'Show Details'}
                            </button>
                        </div>
                        {expandedPolicyId === policy.id && <PolicyDetails policy={policy} />}
                    </div>
                ))}
                <div id="policy-upload-button" className={policies.length > 0 ? 'hidden' : ''}>
                    <UploadZone onUpload={onUpload} isLoading={isLoading} />
                </div>
             </div>
        )}
    </div>
  );
};
