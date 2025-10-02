import React, { useRef, useState } from 'react';
import { ParsedPolicy } from '../types';
import { ShieldCheckIcon, SpinnerIcon, UploadIcon, ShieldExclamationIcon, DocumentTextIcon, PencilIcon, InformationCircleIcon, CheckCircleIcon } from './icons';

interface InsuranceSectionProps {
  policy: ParsedPolicy | null;
  onUpload: (file: File) => void;
  onUpdate: (policy: ParsedPolicy) => void;
  onVerify: () => void;
  isLoading: boolean;
}

const PolicyDisplay: React.FC<{ 
    policy: ParsedPolicy, 
    onUpdate: (policy: ParsedPolicy) => void,
    onVerify: () => void,
}> = ({ policy, onUpdate, onVerify }) => {
    
    const isReviewMode = !policy.isVerified;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        onUpdate({ ...policy, [name]: value });
    };

    const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        onUpdate({ ...policy, [name]: parseFloat(value) || 0 });
    };

    const mainCoverage = policy.coverage.find(c => c.type === 'main');
    const subLimits = policy.coverage.filter(c => c.type === 'sub-limit');

    const renderField = (label: string, name: keyof ParsedPolicy, type: 'text' | 'date' | 'number' | 'select' = 'text', options?: string[]) => {
        if (isReviewMode) {
             if (type === 'select') {
                return (
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <label htmlFor={name} className="text-sm font-medium text-medium">{label}</label>
                        <select 
                            id={name} 
                            name={name} 
                            value={policy[name] as string}
                            onChange={handleChange}
                            className="col-span-2 mt-1 block w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        >
                            {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                );
            }
            return (
                <div className="grid grid-cols-3 gap-2 items-center">
                    <label htmlFor={name} className="text-sm font-medium text-medium">{label}</label>
                    <input 
                        id={name} 
                        name={name} 
                        type={type} 
                        value={policy[name] as string | number}
                        onChange={type === 'number' ? handleNumericChange : handleChange}
                        className="col-span-2 mt-1 block w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
            );
        }
        return (
            <div className="flex justify-between py-1">
                <span className="text-sm text-medium">{label}:</span>
                <span className="text-sm font-semibold text-dark">{policy[name]}</span>
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            {isReviewMode && (
                <div className="p-4 mb-6 bg-amber-50 border-l-4 border-amber-400 text-amber-900">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <InformationCircleIcon className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm font-bold">
                                Review Required (AI Confidence: {policy.confidenceScore}%)
                            </p>
                            <p className="mt-1 text-xs">
                                Please verify the details extracted by the AI. Make any necessary corrections below and then click "Confirm & Save Policy".
                            </p>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold tracking-tight text-dark font-heading flex items-center gap-2">
                        <ShieldCheckIcon className={`h-6 w-6 ${policy.isVerified ? 'text-success' : 'text-amber-500'}`}/>
                        <span>{isReviewMode ? 'Reviewing Policy' : 'Policy Details'}</span>
                    </h3>
                     {isReviewMode ? renderField('Provider', 'provider') : <p className="text-sm text-medium mt-1">{policy.provider}</p>}
                </div>
                 <div className="text-right">
                    {isReviewMode ? renderField('Deductible', 'deductible', 'number') : <>
                        <p className="text-sm text-medium">Deductible</p>
                        <p className="text-lg font-bold text-dark">${policy.deductible.toLocaleString()}</p>
                    </>}
                 </div>
            </div>

            <div className="mt-4 border-t pt-4 space-y-2">
                {renderField('Policy #', 'policyNumber')}
                {renderField('Policyholder', 'policyHolder')}
                <div className="grid grid-cols-2 gap-4">
                  {renderField('Effective Date', 'effectiveDate', 'date')}
                  {renderField('Expiration Date', 'expirationDate', 'date')}
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    {renderField('Settlement Method', 'lossSettlementMethod', 'select', ['RCV', 'ACV'])}
                    {renderField('Loss of Use Limit', 'coverageD_limit', 'number')}
                </div>
            </div>

            <div className="mt-4 border-t pt-4">
                {mainCoverage && (
                    <div className="flex justify-between items-center py-2">
                        <span className="font-semibold text-dark">{mainCoverage.category}</span>
                        <span className="font-bold text-dark">${mainCoverage.limit.toLocaleString()}</span>
                    </div>
                )}
                {subLimits.length > 0 && (
                    <div className="mt-2 space-y-2 text-sm">
                        <h4 className="font-semibold text-medium">Special Limits</h4>
                        {subLimits.map(limit => (
                             <div key={limit.category} className="flex justify-between items-center py-1 px-3 bg-slate-50 rounded-md">
                                <span className="text-medium">{limit.category}</span>
                                <span className="font-medium text-dark">${limit.limit.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
             {policy.exclusions.length > 0 && (
                 <div className="mt-4 border-t pt-4 text-sm">
                    <h4 className="font-semibold text-medium mb-2">Key Exclusions</h4>
                    <div className="flex flex-wrap gap-2">
                        {policy.exclusions.map(ex => (
                            <span key={ex} className="text-xs bg-danger/10 text-danger font-medium px-2 py-1 rounded-full border border-danger/20">{ex}</span>
                        ))}
                    </div>
                </div>
             )}

            {isReviewMode && (
                <div className="mt-6 border-t pt-4">
                    <button onClick={onVerify} className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Confirm & Save Policy</span>
                    </button>
                </div>
            )}
        </div>
    );
};

const UploadZone: React.FC<{ onUpload: (file: File) => void, isLoading: boolean }> = ({ onUpload, isLoading }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
          onUpload(event.target.files[0]);
        }
    };
    
    const handleClick = () => {
        if (!isLoading) fileInputRef.current?.click();
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !isLoading) {
            onUpload(e.dataTransfer.files[0]);
        }
    };

    return (
         <div 
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDraggingOver ? 'border-primary bg-primary/5' : 'border-slate-300'
            } ${isLoading ? 'cursor-default bg-slate-100' : 'cursor-pointer hover:border-primary/70'}`}
            onClick={handleClick}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
             <input
                type="file"
                accept="application/pdf"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                disabled={isLoading}
            />
            {isLoading ? (
                <div className="flex flex-col items-center justify-center space-y-3 text-medium">
                    <SpinnerIcon className="h-10 w-10 text-primary"/>
                    <span className="font-semibold">Parsing Policy with Gemini...</span>
                    <span className="text-sm">This may take a moment.</span>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center space-y-3 text-medium">
                    <DocumentTextIcon className="h-10 w-10 text-slate-400"/>
                    <p className="font-semibold">
                        Drag & drop your policy PDF or <span className="text-primary">browse</span>
                    </p>
                    <p className="text-sm text-slate-500">The first step to smarter claims is understanding your coverage.</p>
                </div>
            )}
        </div>
    );
};

export const InsuranceSection: React.FC<InsuranceSectionProps> = ({ policy, onUpload, onUpdate, onVerify, isLoading }) => {
  return (
    <div className="mb-10">
        <h3 className="text-xl font-bold tracking-tight text-dark font-heading flex items-center gap-2 mb-4">
            <ShieldExclamationIcon className="h-6 w-6 text-medium"/>
            Insurance Policy
        </h3>
        {policy ? (
            <PolicyDisplay policy={policy} onUpdate={onUpdate} onVerify={onVerify} />
        ) : (
            <UploadZone onUpload={onUpload} isLoading={isLoading} />
        )}
    </div>
  );
};
