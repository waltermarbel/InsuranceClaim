
import React, { useState, useRef, useEffect } from 'react';
import { ParsedPolicy, PolicyVerificationResult, CoverageLimit } from '../types.ts';
import { ShieldCheckIcon, SpinnerIcon, DocumentTextIcon, CheckCircleIcon, PlusIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, TrashIcon, BoltIcon, CurrencyDollarIcon, TagIcon, XCircleIcon, CheckIcon } from './icons.tsx';
import * as geminiService from '../services/geminiService.ts';
import { CurrencyInput } from './CurrencyInput.tsx';

interface InsuranceSectionProps {
  policies: ParsedPolicy[];
  onUpload: (file: File) => void;
  onSetActivePolicy: (policyId: string) => void;
  onUpdatePolicy: (policy: ParsedPolicy) => void;
  isLoading: boolean;
}

const ClauseTag: React.FC<{ 
    text: string; 
    onDelete: () => void; 
    colorClass: string; 
    borderClass: string; 
    textClass: string; 
}> = ({ text, onDelete, colorClass, borderClass, textClass }) => (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border shadow-sm transition-all group ${colorClass} ${borderClass} ${textClass}`}>
        {text}
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="ml-1.5 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity focus:opacity-100">
            <XCircleIcon className="h-3 w-3" />
        </button>
    </span>
);

const ClauseInput: React.FC<{ onAdd: (text: string) => void; onCancel: () => void }> = ({ onAdd, onCancel }) => {
    const [val, setVal] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && val.trim()) {
            onAdd(val.trim());
            setVal('');
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <div className="flex items-center gap-1">
            <input 
                ref={inputRef}
                type="text" 
                value={val} 
                onChange={e => setVal(e.target.value)} 
                onKeyDown={handleKeyDown}
                onBlur={() => val.trim() ? onAdd(val.trim()) : onCancel()}
                className="w-32 px-2 py-1 text-xs border border-primary rounded shadow-sm focus:outline-none" 
                placeholder="Type & Enter..."
            />
        </div>
    );
};

const PolicyDetails: React.FC<{ policy: ParsedPolicy; onUpdate: (p: ParsedPolicy) => void }> = ({ policy, onUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [verificationResult, setVerificationResult] = useState<PolicyVerificationResult | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [addingClause, setAddingClause] = useState<string | null>(null);

    // Local state for editing fields before blur
    const [localPolicy, setLocalPolicy] = useState(policy);

    useEffect(() => {
        setLocalPolicy(policy);
    }, [policy]);

    const handleLocalChange = (field: keyof ParsedPolicy, value: any) => {
        setLocalPolicy(prev => ({ ...prev, [field]: value }));
    };

    const handleBlur = (field: keyof ParsedPolicy) => {
        if (localPolicy[field] !== policy[field]) {
            onUpdate({ ...policy, [field]: localPolicy[field] });
        }
    };

    // Filter helper
    const filterClauses = (clauses: string[] | undefined) => {
        if (!clauses) return [];
        if (!searchTerm) return clauses;
        return clauses.filter(c => c.toLowerCase().includes(searchTerm.toLowerCase()));
    };

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

    const updateCoverage = (index: number, field: keyof CoverageLimit, value: any) => {
        const newCoverage = [...(policy.coverage || [])];
        newCoverage[index] = { ...newCoverage[index], [field]: value };
        onUpdate({ ...policy, coverage: newCoverage });
    };

    const addCoverage = () => {
        const newCoverage = [...(policy.coverage || []), { category: 'New Coverage', limit: 0, type: 'sub-limit' as const }];
        onUpdate({ ...policy, coverage: newCoverage });
    };

    const removeCoverage = (index: number) => {
        const newCoverage = (policy.coverage || []).filter((_, i) => i !== index);
        onUpdate({ ...policy, coverage: newCoverage });
    };

    const addClause = (type: 'triggers' | 'limits' | 'exclusions' | 'conditions', text: string) => {
        const current = policy[type] || [];
        onUpdate({ ...policy, [type]: [...current, text] });
        setAddingClause(null);
    };

    const removeClause = (type: 'triggers' | 'limits' | 'exclusions' | 'conditions', index: number) => {
        const current = policy[type] || [];
        onUpdate({ ...policy, [type]: current.filter((_, i) => i !== index) });
    };

    return (
        <div className="p-6 bg-slate-50/70 rounded-b-lg animate-fade-in-down">
             {/* Verification Banner */}
             {verificationResult && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg relative">
                    <div className="flex justify-between items-start">
                        <h5 className="text-sm font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <CheckCircleIcon className="h-4 w-4"/> AI Verification Complete (Score: {verificationResult.score}/100)
                        </h5>
                        <button onClick={() => setVerificationResult(null)} className="text-blue-400 hover:text-blue-600 absolute top-2 right-2"><span className="sr-only">Close</span>&times;</button>
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

             <div className="flex justify-between items-center mb-6">
                 <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Policy Details</h4>
                 <div className="flex items-center gap-4">
                    {/* Clause Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Search clauses..." 
                            className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-full focus:ring-1 focus:ring-primary outline-none bg-white shadow-sm w-40 transition-all focus:w-56"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <button 
                        onClick={handleVerify} 
                        disabled={isVerifying}
                        className="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-full hover:bg-primary/5 transition flex items-center gap-2 disabled:opacity-50"
                    >
                        {isVerifying ? <SpinnerIcon className="h-3 w-3 animate-spin"/> : <ShieldCheckIcon className="h-3 w-3"/>}
                        {isVerifying ? 'Analyzing...' : 'Verify Policy Details'}
                    </button>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8 text-sm mb-8">
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Policy Number</label>
                                <input 
                                    type="text" 
                                    value={localPolicy.policyNumber || ''} 
                                    onChange={(e) => handleLocalChange('policyNumber', e.target.value)}
                                    onBlur={() => handleBlur('policyNumber')}
                                    className="w-full text-sm font-bold text-dark bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Provider</label>
                                <input 
                                    type="text" 
                                    value={localPolicy.provider || ''} 
                                    onChange={(e) => handleLocalChange('provider', e.target.value)}
                                    onBlur={() => handleBlur('provider')}
                                    className="w-full text-sm font-bold text-dark bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Policyholder</label>
                            <input 
                                type="text" 
                                value={localPolicy.policyHolder || ''} 
                                onChange={(e) => handleLocalChange('policyHolder', e.target.value)}
                                onBlur={() => handleBlur('policyHolder')}
                                className="w-full text-sm font-medium text-dark bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none transition-colors"
                            />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Effective Date</label>
                                <input 
                                    type="date" 
                                    value={localPolicy.effectiveDate || ''} 
                                    onChange={(e) => { handleLocalChange('effectiveDate', e.target.value); onUpdate({...policy, effectiveDate: e.target.value}) }}
                                    className="w-full text-sm text-dark bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Expiration Date</label>
                                <input 
                                    type="date" 
                                    value={localPolicy.expirationDate || ''} 
                                    onChange={(e) => { handleLocalChange('expirationDate', e.target.value); onUpdate({...policy, expirationDate: e.target.value}) }}
                                    className="w-full text-sm text-dark bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Deductible</label>
                                <div className="relative">
                                    <CurrencyInput 
                                        value={policy.deductible || 0} 
                                        onChange={(val) => onUpdate({...policy, deductible: val})}
                                        className="w-full text-lg font-bold text-dark bg-slate-50 border border-slate-200 rounded p-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1" title="Coverage D: Loss of Use">Loss of Use Limit</label>
                                <div className="relative">
                                    <CurrencyInput 
                                        value={policy.coverageD_limit || 0} 
                                        onChange={(val) => onUpdate({...policy, coverageD_limit: val})}
                                        className="w-full text-lg font-bold text-dark bg-slate-50 border border-slate-200 rounded p-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h4 className="font-bold text-dark flex items-center gap-2">
                            <CurrencyDollarIcon className="h-4 w-4 text-emerald-600"/> Coverage Limits
                        </h4>
                        <button onClick={addCoverage} className="text-xs flex items-center gap-1 text-primary hover:underline font-semibold">
                            <PlusIcon className="h-3 w-3"/> Add Limit
                        </button>
                    </div>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {(policy.coverage || []).map((limit, index) => (
                             <div key={index} className="flex items-center gap-2 text-xs bg-white p-2 rounded border border-slate-200 hover:border-primary/40 transition-colors group">
                                <input 
                                    type="text" 
                                    value={limit.category} 
                                    onChange={(e) => updateCoverage(index, 'category', e.target.value)}
                                    className="flex-grow font-medium text-slate-700 bg-transparent border-b border-transparent focus:border-primary outline-none"
                                    placeholder="Coverage Category"
                                />
                                <div className="w-24">
                                    <CurrencyInput 
                                        value={limit.limit} 
                                        onChange={(val) => updateCoverage(index, 'limit', val)}
                                        className="w-full text-right font-semibold text-slate-900 bg-transparent border-b border-transparent focus:border-primary outline-none"
                                    />
                                </div>
                                <select 
                                    value={limit.type} 
                                    onChange={(e) => updateCoverage(index, 'type', e.target.value)}
                                    className="text-[10px] uppercase font-bold bg-slate-100 border-none rounded py-0.5 px-1 cursor-pointer focus:ring-0 text-slate-600"
                                >
                                    <option value="main">Main</option>
                                    <option value="sub-limit">Sub</option>
                                </select>
                                <button onClick={() => removeCoverage(index)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                                    <TrashIcon className="h-4 w-4"/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI Auto-Tagged Clauses Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Triggers & Limits */}
                <div className="space-y-6">
                    {/* Triggers */}
                    <div>
                        <div className="flex justify-between items-end border-b pb-2 mb-3">
                            <h4 className="font-semibold text-dark flex items-center gap-2 text-sm">
                                <BoltIcon className="h-4 w-4 text-indigo-500"/> 
                                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Trigger</span>
                                Covered Perils
                            </h4>
                            <button onClick={() => setAddingClause('triggers')} className="text-xs text-indigo-600 hover:text-indigo-800"><PlusIcon className="h-3 w-3"/></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {filterClauses(policy.triggers).map((trigger, i) => (
                                <ClauseTag 
                                    key={i} 
                                    text={trigger} 
                                    onDelete={() => removeClause('triggers', (policy.triggers || []).indexOf(trigger))}
                                    colorClass="bg-indigo-50" borderClass="border-indigo-100" textClass="text-indigo-700"
                                />
                            ))}
                            {addingClause === 'triggers' && <ClauseInput onAdd={t => addClause('triggers', t)} onCancel={() => setAddingClause(null)} />}
                            {(!policy.triggers?.length && addingClause !== 'triggers') && <p className="text-xs text-slate-400 italic">No triggers detected.</p>}
                        </div>
                    </div>

                    {/* Textual Limits */}
                    <div>
                        <div className="flex justify-between items-end border-b pb-2 mb-3">
                            <h4 className="font-semibold text-dark flex items-center gap-2 text-sm">
                                <TagIcon className="h-4 w-4 text-slate-500"/>
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Limit</span>
                                Special Limits & Clauses
                            </h4>
                            <button onClick={() => setAddingClause('limits')} className="text-xs text-slate-600 hover:text-slate-800"><PlusIcon className="h-3 w-3"/></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {filterClauses(policy.limits).map((limit, i) => (
                                <ClauseTag 
                                    key={i} 
                                    text={limit} 
                                    onDelete={() => removeClause('limits', (policy.limits || []).indexOf(limit))}
                                    colorClass="bg-slate-50" borderClass="border-slate-200" textClass="text-slate-700"
                                />
                            ))}
                            {addingClause === 'limits' && <ClauseInput onAdd={t => addClause('limits', t)} onCancel={() => setAddingClause(null)} />}
                            {(!policy.limits?.length && addingClause !== 'limits') && <p className="text-xs text-slate-400 italic">No special limit clauses detected.</p>}
                        </div>
                    </div>
                </div>

                {/* Right Column: Conditions & Exclusions */}
                <div className="space-y-6">
                    {/* Conditions */}
                    <div>
                        <div className="flex justify-between items-end border-b pb-2 mb-3">
                            <h4 className="font-semibold text-dark flex items-center gap-2 text-sm">
                                <ExclamationTriangleIcon className="h-4 w-4 text-amber-500"/> 
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Condition</span>
                                Duties & Requirements
                            </h4>
                            <button onClick={() => setAddingClause('conditions')} className="text-xs text-amber-600 hover:text-amber-800"><PlusIcon className="h-3 w-3"/></button>
                        </div>
                        <ul className="space-y-2">
                            {filterClauses(policy.conditions).map((condition, i) => (
                                <li key={i} className="text-xs text-slate-700 bg-amber-50 p-2 rounded border border-amber-100 flex items-start gap-2 group">
                                    <div className="mt-1 w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0"></div>
                                    <span className="leading-snug flex-grow">{condition}</span>
                                    <button onClick={() => removeClause('conditions', (policy.conditions || []).indexOf(condition))} className="opacity-0 group-hover:opacity-100 text-amber-400 hover:text-amber-600"><XCircleIcon className="h-3 w-3"/></button>
                                </li>
                            ))}
                            {addingClause === 'conditions' && (
                                <li className="text-xs p-1">
                                    <ClauseInput onAdd={t => addClause('conditions', t)} onCancel={() => setAddingClause(null)} />
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* Exclusions */}
                    <div>
                        <div className="flex justify-between items-center mb-3 border-b pb-2">
                            <h4 className="font-semibold text-dark text-sm flex items-center gap-2">
                                <ShieldCheckIcon className="h-4 w-4 text-rose-500"/>
                                <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Exclusion</span>
                                Policy Exclusions
                            </h4>
                            <button onClick={() => setAddingClause('exclusions')} className="text-xs text-rose-600 hover:text-rose-800"><PlusIcon className="h-3 w-3"/></button>
                        </div>
                        <div className="max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg p-3 custom-scrollbar">
                            <div className="flex flex-wrap gap-2">
                                {filterClauses(policy.exclusions).map((ex, i) => (
                                    <ClauseTag 
                                        key={i} 
                                        text={ex} 
                                        onDelete={() => removeClause('exclusions', (policy.exclusions || []).indexOf(ex))}
                                        colorClass="bg-rose-50" borderClass="border-rose-100" textClass="text-rose-700"
                                    />
                                ))}
                                {addingClause === 'exclusions' && <ClauseInput onAdd={t => addClause('exclusions', t)} onCancel={() => setAddingClause(null)} />}
                            </div>
                            {(!policy.exclusions?.length && addingClause !== 'exclusions') && (
                                <p className="text-xs text-slate-400 text-center py-4">No exclusions listed.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const UploadZone: React.FC<{ 
    onUpload: (file: File) => void, 
    isLoading: boolean, 
    triggerRef: React.RefObject<HTMLInputElement>,
    compact?: boolean
}> = ({ onUpload, isLoading, triggerRef, compact }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            if (file.type === 'application/pdf') {
                onUpload(file);
            } else {
                setError("Only PDF files are supported.");
                // Reset input
                event.target.value = '';
            }
        }
    };
    
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!isLoading) setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragOver(false);
        setError(null);

        if (isLoading) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type === 'application/pdf') {
                onUpload(file);
            } else {
                setError("Please upload a valid PDF policy document.");
            }
        }
    };
    
    const handleClick = () => {
        if (!isLoading) triggerRef.current?.click();
    };

    const baseClasses = `border-2 border-dashed rounded-lg text-center transition-all duration-200 
        ${isLoading ? 'cursor-default bg-slate-50 border-slate-300' : 'cursor-pointer'}
        ${isDragOver ? 'border-primary bg-primary/5 scale-[1.01] shadow-inner' : 'border-slate-300 hover:border-primary/60 hover:bg-slate-50'}
        ${error ? 'border-red-300 bg-red-50 hover:bg-red-50' : ''}
    `;
    
    const paddingClass = compact ? 'p-6' : 'p-12';

    return (
         <div 
            className={`${baseClasses} ${paddingClass}`}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
             <input type="file" accept="application/pdf" ref={triggerRef} onChange={handleFileChange} className="hidden" disabled={isLoading}/>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center space-y-2 text-medium animate-pulse">
                    <SpinnerIcon className={compact ? "h-6 w-6 text-primary" : "h-10 w-10 text-primary"}/>
                    <span className="font-semibold text-primary text-sm">AI is analyzing your policy...</span>
                    {!compact && <p className="text-xs text-slate-400">Extracting triggers, limits, and exclusions.</p>}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-2 text-medium">
                    <div className={`rounded-full transition-colors ${compact ? 'p-2' : 'p-3'} ${isDragOver ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-400'} ${error ? 'bg-red-100 text-red-500' : ''}`}>
                        {error ? <XCircleIcon className={compact ? "h-6 w-6" : "h-8 w-8"}/> : <DocumentTextIcon className={compact ? "h-6 w-6" : "h-8 w-8"}/>}
                    </div>
                    <div>
                        <p className={`font-bold ${error ? 'text-red-600' : 'text-dark'}`}>
                            {error ? error : (compact ? "Upload another policy PDF" : "Drag & drop policy PDF")}
                        </p>
                        {!error && <p className="text-xs text-slate-500 mt-1">or click to browse</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export const InsuranceSection: React.FC<InsuranceSectionProps> = ({ policies, onUpload, onSetActivePolicy, onUpdatePolicy, isLoading }) => {
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
                    <div key={policy.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className={`p-4 flex justify-between items-center transition-colors ${expandedPolicyId === policy.id ? 'bg-slate-50/50' : 'bg-white'}`}>
                            <div className="flex items-center gap-4">
                                <button onClick={() => onSetActivePolicy(policy.id)} className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${policy.isActive ? 'border-primary bg-primary' : 'border-slate-300 bg-white group-hover:border-primary'}`}>
                                        {policy.isActive && <CheckCircleIcon className="h-3 w-3 text-white" />}
                                    </div>
                                    <div>
                                        <span className={`font-bold block ${policy.isActive ? 'text-primary' : 'text-dark'}`}>{policy.policyName || `Policy #${policy.policyNumber}`}</span>
                                        <span className="text-xs text-slate-500">{policy.provider}</span>
                                    </div>
                                </button>
                                {policy.isVerified ? (
                                    <span className="hidden sm:flex text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full items-center gap-1" title="Verified by user">
                                        <CheckCircleIcon className="h-3 w-3" /> Verified
                                    </span>
                                ) : (
                                    <span className="hidden sm:flex text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full items-center gap-1">
                                        <ExclamationTriangleIcon className="h-3 w-3" /> Review
                                    </span>
                                )}
                            </div>
                            <button onClick={() => toggleExpand(policy.id)} className="text-sm font-semibold text-slate-500 hover:text-primary transition-colors">
                                {expandedPolicyId === policy.id ? 'Hide Details' : 'Show Details'}
                            </button>
                        </div>
                        {expandedPolicyId === policy.id && (
                            <PolicyDetails 
                                policy={policy} 
                                onUpdate={onUpdatePolicy} 
                            />
                        )}
                    </div>
                ))}
                
                {/* Additional upload zone when policies exist */}
                <div className="mt-2">
                    <UploadZone 
                        onUpload={onUpload} 
                        isLoading={isLoading} 
                        triggerRef={fileInputRef} 
                        compact={true}
                    />
                </div>
             </div>
        )}
    </div>
  );
};
