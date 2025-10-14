import React, { useRef, useState } from 'react';
// Fix: Added .ts extension to file path
import { ParsedPolicy } from '../types.ts';
import { ShieldCheckIcon, SpinnerIcon, UploadIcon, ShieldExclamationIcon, DocumentTextIcon, PencilIcon, InformationCircleIcon, CheckCircleIcon, PlusIcon, TrashIcon } from './icons';
import { CurrencyInput } from './CurrencyInput';

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
}> = ({ policy: initialPolicy, onUpdate, onVerify }) => {
    
    const [isEditing, setIsEditing] = useState(false);
    const [policy, setPolicy] = useState(initialPolicy);

    const isReviewMode = !initialPolicy.isVerified;

    const handleEdit = () => {
        setPolicy(initialPolicy);
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        setPolicy(initialPolicy); // Revert changes
    };

    const handleSave = () => {
        onUpdate(policy);
        setIsEditing(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setPolicy(prev => ({ ...prev, [name]: value }));
    };

    const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPolicy(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const handleSubLimitChange = (index: number, field: 'category' | 'limit', value: string | number) => {
        const updatedCoverage = [...policy.coverage];
        const subLimits = updatedCoverage.filter(c => c.type === 'sub-limit');
        const mainCoverage = updatedCoverage.find(c => c.type === 'main');
        
        const targetLimit = subLimits[index];
        if (targetLimit) {
            (targetLimit[field] as any) = value;
        }

        const newSubLimits = [...subLimits];
        
        setPolicy(prev => ({
            ...prev,
            coverage: mainCoverage ? [mainCoverage, ...newSubLimits] : newSubLimits
        }));
    };

    const handleAddSubLimit = () => {
        const newLimit = { category: '', limit: 0, type: 'sub-limit' as const };
        setPolicy(prev => ({
            ...prev,
            coverage: [...prev.coverage, newLimit]
        }));
    };

    const handleRemoveSubLimit = (indexToRemove: number) => {
        const subLimits = policy.coverage.filter(c => c.type === 'sub-limit');
        const updatedSubLimits = subLimits.filter((_, index) => index !== indexToRemove);
        const mainCoverage = policy.coverage.find(c => c.type === 'main');
        
        setPolicy(prev => ({
            ...prev,
            coverage: mainCoverage ? [mainCoverage, ...updatedSubLimits] : updatedSubLimits
        }));
    };

    const mainCoverage = policy.coverage.find(c => c.type === 'main');
    const subLimits = policy.coverage.filter(c => c.type === 'sub-limit');
    
    const displayPolicy = isEditing ? policy : initialPolicy;
    const displaySubLimits = displayPolicy.coverage.filter(c => c.type === 'sub-limit');

    const renderField = (label: string, name: keyof ParsedPolicy, type: 'text' | 'date' | 'number' | 'select' = 'text', options?: string[]) => {
        const isEditable = isReviewMode || isEditing;

        if (isEditable) {
             if (type === 'select') {
                return (
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <label htmlFor={name} className="text-sm font-medium text-medium">{label}</label>
                        <select 
                            id={name} 
                            name={name} 
                            value={displayPolicy[name] as string}
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
                        value={displayPolicy[name] as string | number}
                        onChange={type === 'number' ? handleNumericChange : handleChange}
                        className="col-span-2 mt-1 block w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                </div>
            );
        }
        
        const value = displayPolicy[name];

        if (Array.isArray(value)) {
            return null;
        }

        return (
            <div className="flex justify-between py-1">
                <span className="text-sm text-medium">{label}:</span>
                <span className="text-sm font-semibold text-dark">{value}</span>
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
                                Review Required (AI Confidence: {initialPolicy.confidenceScore}%)
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
                        <ShieldCheckIcon className={`h-6 w-6 ${initialPolicy.isVerified ? 'text-success' : 'text-amber-500'}`}/>
                        <span>{isReviewMode ? 'Reviewing Policy' : 'Policy Details'}</span>
                    </h3>
                     {renderField('Provider', 'provider')}
                </div>
                 <div className="text-right">
                    {renderField('Deductible', 'deductible', 'number')}
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
                
                <div className="mt-2 space-y-2 text-sm">
                    <h4 className="font-semibold text-medium">Special Limits</h4>
                    {isEditing ? (
                        <div className="space-y-3">
                            {subLimits.map((limit, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-md">
                                    <input
                                        type="text"
                                        placeholder="Category Name"
                                        value={limit.category}
                                        onChange={(e) => handleSubLimitChange(index, 'category', e.target.value)}
                                        className="flex-grow block w-full px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                    />
                                     <CurrencyInput
                                        value={limit.limit}
                                        onChange={(val) => handleSubLimitChange(index, 'limit', val)}
                                        className="w-32 block px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                     />
                                    <button onClick={() => handleRemoveSubLimit(index)} className="p-1 text-danger hover:bg-danger/10 rounded-md">
                                        <TrashIcon className="h-4 w-4"/>
                                    </button>
                                </div>
                            ))}
                             <button onClick={handleAddSubLimit} className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-1.5 text-xs font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Sub-Limit</span>
                            </button>
                        </div>
                    ) : (
                        <>
                            {displaySubLimits.length > 0 && displaySubLimits.map(limit => (
                                 <div key={limit.category} className="flex justify-between items-center py-1 px-3 bg-slate-50 rounded-md">
                                    <span className="text-medium">{limit.category}</span>
                                    <span className="font-medium text-dark">${limit.limit.toLocaleString()}</span>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
             {displayPolicy.exclusions.length > 0 && (
                 <div className="mt-4 border-t pt-4 text-sm">
                    <h4 className="font-semibold text-medium mb-2">Key Exclusions</h4>
                    <div className="flex flex-wrap gap-2">
                        {displayPolicy.exclusions.map(ex => (
                            <span key={ex} className="text-xs bg-danger/10 text-danger font-medium px-2 py-1 rounded-full border border-danger/20">{ex}</span>
                        ))}
                    </div>
                </div>
             )}
            
            {!isReviewMode && !isEditing && (
                 <div className="mt-6 border-t pt-4 flex justify-end">
                    <button onClick={handleEdit} className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">
                        <PencilIcon className="h-4 w-4" />
                        <span>Edit Policy</span>
                    </button>
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
            {isEditing && (
                <div className="mt-6 border-t pt-4 flex justify-end space-x-3">
                    <button onClick={handleCancel} className="px-4 py-2 text-sm font-semibold bg-white text-medium border border-slate-300 rounded-md shadow-sm hover:bg-slate-50 transition">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="flex items-center justify-center space-x-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-md shadow-sm hover:bg-primary-dark transition">
                        <CheckCircleIcon className="h-5 w-5" />
                        <span>Save Changes</span>
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