
import React, { useRef, useState } from 'react';
import { ParsedPolicy, PolicyVerificationResult } from '../types.ts';
import { ShieldCheckIcon, SpinnerIcon, DocumentTextIcon, CheckCircleIcon, PlusIcon, ExclamationTriangleIcon, MagnifyingGlassIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';

interface InsuranceSectionProps {
  policies: ParsedPolicy[];
  onUpload: (file: File) => void;
  onSetActivePolicy: (policyId: string) => void;
  isLoading: boolean;
}

const PolicyDetails: React.FC<{ policy: ParsedPolicy }> = ({ policy }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [verificationResult, setVerificationResult] = useState<PolicyVerificationResult | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const mainCoverage = policy.coverage.find(c => c.type === 'main');
    const subLimits = policy.coverage.filter(c => c.type === 'sub-limit');
    
    // Filter exclusions based on search term
    const filteredExclusions = policy.exclusions.filter(ex => 
        ex.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleVerify = async () => {
        setIsVerifying(true);
        setVerificationResult(null);
        try {
            const result = await geminiService.verifyPolicyDetails(policy);
            setVerificationResult(result);
        } catch (error) {
            console.error("Verification failed", error);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="p-4 bg-slate-50/70 rounded-b-lg">
             {/* Verification Banner */}
             {verificationResult && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-start">
                        <h5 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <CheckCircleIcon className="h-4 w-4"/> AI Verification Complete (Score: {verificationResult.score}/100)
                        </h5>
                        <button onClick={() => setVerificationResult(null)} className="text-blue-400 hover:text-blue-600"><span className="sr-only">Close</span>&times;</button>
                    </div>
                    {verificationResult.suggestions.length > 0 ? (
                        <ul className="list-disc list-inside text-xs text-blue-700 space-y-1">
                            {verificationResult.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    ) : (
                        <p className="text-xs text-blue-700">No major issues found. Policy details look consistent.</p>
                    )}
                </div>
             )}

             <div className="flex justify-end mb-4">
                 <button 
                    onClick={handleVerify} 
                    disabled={isVerifying}
                    className="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-full hover:bg-primary/5 transition flex items-center gap-2 disabled:opacity-50"
                 >
                    {isVerifying ? <SpinnerIcon className="h-3 w-3 animate-spin"/> : <ShieldCheckIcon className="h-3 w-3"/>}
                    {isVerifying ? 'Analyzing...' : 'Verify Policy Details'}
                 </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 text-sm">
                <div className="space-y-4">
                    <h4 className="font-semibold text-dark border-b pb-2">Policy Info</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-xs text-medium">Policy #</p><p className="font-semibold text-dark">{policy.policyNumber}</p></div>
                        <div><p className="text-xs text-medium">Type</p><p className="font-semibold text-dark">{policy.policyType || 'N/A'}</p></div>
                    </div>
                    <div><p className="text-xs text-medium">Policyholder</p><p className="font-semibold text-dark truncate">{policy.policyHolder}</p></div>
                    <div><p className="text-xs text-medium">Provider</p><p className="font-semibold text-dark">{policy.provider}</p></div>
                     <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-xs text-medium">Effective</p><p className="font-semibold text-dark">{policy.effectiveDate || ''}</p></div>
                        <div><p className="text-xs text-medium">Expires</p><p className="font-semibold text-dark">{policy.expirationDate || ''}</p></div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="font-semibold text-dark border-b pb-2">Coverage & Limits</h4>
                    {mainCoverage && (
                        <div className="flex justify-between items-center">
                            <span className="text-medium">{mainCoverage.category}</span>
                            <span className="font-bold text-lg text-dark">${mainCoverage.limit.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-medium">Loss of Use (Coverage D)</span>
                        <span className="font-semibold text-dark">${(policy.coverageD_limit || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-medium">Deductible</span>
                        <span className="font-semibold text-dark">${policy.deductible.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-medium">Settlement</span>
                        <span className="font-semibold text-dark uppercase bg-slate-100 px-2 py-0.5 rounded text-xs">{policy.lossSettlementMethod}</span>
                    </div>
                    
                    <div className="pt-2">
                        <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Sub-Limits</h5>
                        <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {subLimits.map((limit, index) => (
                                 <div key={index} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-100">
                                    <span className="text-slate-700">{limit.category}</span>
                                    <span className="font-semibold text-slate-900">${limit.limit.toLocaleString()}</span>
                                </div>
                            ))}
                             {subLimits.length === 0 && <p className="text-xs text-slate-400 italic">No specific sub-limits found.</p>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Conditions & Duties Section */}
            {policy.conditions && policy.conditions.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-dark pb-2 flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-4 w-4 text-amber-500"/> 
                        Conditions & Duties of the Insured
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">
                        These are critical obligations you must fulfill to ensure your claim is covered (e.g., notification timelines).
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {policy.conditions.map((condition, i) => (
                            <li key={i} className="text-xs text-slate-700 bg-amber-50 p-2.5 rounded-md border border-amber-100 flex items-start gap-2.5 shadow-sm">
                                <div className="mt-0.5 bg-amber-200 rounded-full p-0.5 flex-shrink-0">
                                    <div className="w-1.5 h-1.5 bg-amber-600 rounded-full"></div>
                                </div>
                                <span className="leading-snug">{condition}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Structured Exclusions Section */}
            <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-dark">Policy Exclusions</h4>
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Search exclusions..." 
                            className="pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-primary outline-none w-48"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg p-2">
                    {filteredExclusions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {filteredExclusions.map((ex, i) => (
                                <span key={i} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                    {ex}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 text-center py-4">
                            {searchTerm ? 'No matching exclusions found.' : 'No exclusions listed.'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};


const UploadZone: React.FC<{ onUpload: (file: File) => void, isLoading: boolean, triggerRef: React.RefObject<HTMLInputElement> }> = ({ onUpload, isLoading, triggerRef }) => {
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
          onUpload(event.target.files[0]);
        }
    };
    
    const handleClick = () => {
        if (!isLoading) triggerRef.current?.click();
    };

    return (
         <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors border-slate-300 ${isLoading ? 'cursor-default bg-slate-100' : 'cursor-pointer hover:border-primary/70'}`}
            onClick={handleClick}
        >
             <input type="file" accept="application/pdf" ref={triggerRef} onChange={handleFileChange} className="hidden" disabled={isLoading}/>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center space-y-3 text-medium">
                    <SpinnerIcon className="h-10 w-10 text-primary"/>
                    <span className="font-semibold">AI is analyzing your policy...</span>
                    <p className="text-xs text-slate-400">Extracting coverages, exclusions, and conditions.</p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-3 text-medium">
                    <DocumentTextIcon className="h-10 w-10 text-slate-400"/>
                    <p className="font-semibold">
                        Drag & drop a policy PDF or <span className="text-primary">browse</span>
                    </p>
                    <p className="text-xs text-slate-400">Supported: PDF (Declarations Page preferred)</p>
                </div>
            )}
        </div>
    );
};

export const InsuranceSection: React.FC<InsuranceSectionProps> = ({ policies, onUpload, onSetActivePolicy, isLoading }) => {
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(policies.find(p => p.isActive)?.id || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleExpand = (policyId: string) => {
    setExpandedPolicyId(prev => prev === policyId ? null : policyId);
  }

  const handleAddPolicyClick = () => {
      fileInputRef.current?.click();
  };

  return (
    <div className="mb-10">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold tracking-tight text-dark font-heading flex items-center gap-2">
                <ShieldCheckIcon className="h-6 w-6 text-medium"/>
                Insurance Policies
            </h3>
            {policies.length > 0 && (
                <button onClick={handleAddPolicyClick} disabled={isLoading} className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline disabled:opacity-50">
                    <PlusIcon className="h-4 w-4"/> Add Policy
                </button>
            )}
        </div>

        {policies.length === 0 ? (
            <UploadZone onUpload={onUpload} isLoading={isLoading} triggerRef={fileInputRef} />
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
                
                {/* Hidden input for adding additional policies when list is not empty */}
                <input 
                    type="file" 
                    accept="application/pdf" 
                    ref={fileInputRef} 
                    onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} 
                    className="hidden" 
                    disabled={isLoading}
                />
             </div>
        )}
    </div>
  );
};
